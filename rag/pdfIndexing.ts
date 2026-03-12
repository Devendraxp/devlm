import "dotenv/config";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { storeDocuments } from "@/rag/vectorStore";
import { prisma } from "@/lib/prisma";
export const maxDuration = 300;
export const runtime = "nodejs";

export async function indexPDF(filePath: string, sourceId: string, threadId?: string) {
  await prisma.document.update({
    where: { id: sourceId },
    data: { status: "PROCESSING" },
  });

  try {
    const loader = new PDFLoader(filePath);
    const docs = await loader.load();

    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });

    const chunks = await splitter.splitDocuments(docs);

    const enrichedChunks = chunks.map((doc) => {
      const page = doc.metadata?.page ?? doc.metadata?.loc?.pageNumber ?? null;

      return {
        pageContent: doc.pageContent,
        metadata: {
          document_id: sourceId,
          source: "pdf",
          page,
          ...(threadId ? { thread_id: threadId } : {}),
        },
      };
    });

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
