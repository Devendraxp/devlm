import "dotenv/config";
import { DocxLoader } from "@langchain/community/document_loaders/fs/docx";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { storeDocuments } from "@/rag/vectorStore";
import { prisma } from "@/lib/prisma";
export const maxDuration = 300;
export const runtime = "nodejs";

export async function docxIndexing(filePath: string, sourceId: string, threadId?: string) {
  await prisma.document.update({
    where: { id: sourceId },
    data: { status: "PROCESSING" },
  });

  try {
    const loader = new DocxLoader(filePath);
    const docs = await loader.load();

    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });

    const chunks = await splitter.splitDocuments(docs);

    const enrichedChunks = chunks.map((doc) => ({
      ...doc,
      metadata: {
        ...doc.metadata,
        source: "docx",
        document_id: sourceId,
        ...(threadId ? { thread_id: threadId } : {}),
      },
    }));

    await storeDocuments(enrichedChunks);

    await prisma.document.update({
      where: { id: sourceId },
      data: { status: "INDEXED" },
    });

    return { sourceId };
  } catch (error) {
    await prisma.document.update({
      where: { id: sourceId },
      data: { status: "FAILED" },
    });
    throw error;
  }
}
