import "dotenv/config";
import { YoutubeTranscript } from "youtube-transcript";
import { Document } from "@langchain/core/documents";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { storeDocuments } from "@/rag/vectorStore";
import { prisma } from "@/lib/prisma";

export const maxDuration = 300;
export const runtime = "nodejs";

export async function youtubeIndexing(
  url: string,
  sourceId: string,
  threadId?: string,
) {
  await prisma.document.update({
    where: { id: sourceId },
    data: { status: "PROCESSING" },
  });

  try {
    const transcriptResponse = await YoutubeTranscript.fetchTranscript(url);

    const fullText = transcriptResponse.map((item) => item.text).join(" ");

    const docs = [
      new Document({
        pageContent: fullText,
        metadata: {
          source: "youtube",
          url,
          document_id: sourceId,
        },
      }),
    ];

    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });

    const chunks = await splitter.splitDocuments(docs);

    const enrichedChunks = chunks.map((doc) => ({
      ...doc,
      metadata: {
        ...doc.metadata,
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
    console.error("YouTube Indexing Error:", error);
    throw error;
  }
}
