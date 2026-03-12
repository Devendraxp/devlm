import "dotenv/config";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { TaskType } from "@google/generative-ai";
import { QdrantVectorStore } from "@langchain/qdrant";
import { generateText, streamText } from "ai";
import { groq } from "@ai-sdk/groq";

export async function enhanceUserMessage(userQuery: string) {
  const { text } = await generateText({
    model: groq("openai/gpt-oss-20b"),
    prompt: `Enhance the following user query to be more detailed and specific, as if you were trying to get the best possible answer from a RAG system. Add relevant context and clarify any ambiguities.

User Query:
${userQuery}

Enhanced Query: `,
  });
  return text;
}

export async function generateHyde(userQuery: string) {
  const { text } = await generateText({
    model: groq("openai/gpt-oss-20b"),
    prompt: `You are given access to a knowledge base that includes:
- GitHub repositories
- PDFs
- PPT slides
- Websites
- YouTube videos
- Doc and Docx files

Write a detailed factual answer to this question as if you had access to all of that data.

Question:
${userQuery}

Write a single coherent explanation. Do not say you are guessing.`,
  });
  return text;
}

export async function retrieveRAGData(query: string, threadId: string) {
  if (!threadId) {
    throw new Error("A valid threadId is required for RAG retrieval.");
  }

  const embeddings = new GoogleGenerativeAIEmbeddings({
    model: "gemini-embedding-001",
    taskType: TaskType.RETRIEVAL_QUERY,
  });

  const vectorStore = new QdrantVectorStore(embeddings, {
    url: process.env.QDRANT_URL!,
    apiKey: process.env.QDRANT_API_KEY!,
    collectionName: "deva",
  });

  try {
    const relevantDocs = await vectorStore.similaritySearch(query, 5, {
      must: [
        {
          key: "metadata.thread_id",
          match: { value: threadId },
        },
      ],
    });
    return relevantDocs;
  } catch (e: unknown) {
    const errData = e && typeof e === "object" && "data" in e ? (e as { data: unknown }).data : undefined;
    console.error("RAG retrieval failed:", e, errData ? JSON.stringify(errData) : "");
    return [];
  }
}
