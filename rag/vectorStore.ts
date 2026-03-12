import "dotenv/config";
import { randomUUID } from "crypto";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { TaskType } from "@google/generative-ai";
import { QdrantVectorStore } from "@langchain/qdrant";

interface Document {
  pageContent: string;
  metadata: {
    [key: string]: any;
  };
}

export async function storeDocuments(docs: Document[]): Promise<void> {
  const embeddings = new GoogleGenerativeAIEmbeddings({
    model: "gemini-embedding-001",
    taskType: TaskType.RETRIEVAL_DOCUMENT,
  });

  const vectorStore = await QdrantVectorStore.fromExistingCollection(
    embeddings,
    {
      url: process.env.QDRANT_URL,
      apiKey: process.env.QDRANT_API_KEY,
      collectionName: "deva",
    },
  );

  // Filter out empty/whitespace-only documents that would produce 0-dim vectors
  const validDocs = docs.filter((doc) => doc.pageContent?.trim().length > 0);
  if (validDocs.length === 0) {
    console.warn("No valid documents to store (all empty)");
    return;
  }

  const BATCH_SIZE = 50;

  for (let i = 0; i < validDocs.length; i += BATCH_SIZE) {
    const batch = validDocs.slice(i, i + BATCH_SIZE);

    const docsWithMetadata = batch.map((doc, index) => ({
      ...doc,
      metadata: {
        ...doc.metadata,
        chunk_index: i + index,
      },
    }));

    const batchIds = docsWithMetadata.map(() => randomUUID());

    await vectorStore.addDocuments(docsWithMetadata, { ids: batchIds });
  }

  console.log(`Stored ${validDocs.length} documents in Qdrant`);
}

export async function deleteDocumentVectors(sourceId: string): Promise<void> {
  const qdrantUrl = process.env.QDRANT_URL;
  const apiKey = process.env.QDRANT_API_KEY;

  const res = await fetch(`${qdrantUrl}/collections/devlm/points/delete`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(apiKey ? { "api-key": apiKey } : {}),
    },
    body: JSON.stringify({
      filter: {
        must: [{ key: "document_id", match: { value: sourceId } }],
      },
    }),
  });

  if (!res.ok) {
    throw new Error(`Failed to delete vectors for document ${sourceId}: ${res.status}`);
  }

  console.log(`Deleted vectors for document ${sourceId} from Qdrant`);
}
