import "dotenv/config";
import { SRTLoader } from "@langchain/community/document_loaders/fs/srt";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { storeDocuments } from "@/rag/vectorStore";
import { prisma } from "@/lib/prisma";
export const maxDuration = 300;
export const runtime = "nodejs";

export async function subtitleIndexing(filePath: string, sourceId: string, threadId?: string) {
  await prisma.document.update({
    where: { id: sourceId },
    data: { status: "PROCESSING" },
  });

  try {
    const loader = new SRTLoader(filePath);
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
        source: "srt",
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
