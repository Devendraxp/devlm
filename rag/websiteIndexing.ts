import "dotenv/config";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { storeDocuments } from "@/rag/vectorStore";
import { prisma } from "@/lib/prisma";

import { tavily } from "@tavily/core";

export const maxDuration = 300;
export const runtime = "nodejs";

export async function websiteIndexing(url: string, sourceId: string, threadId?: string) {
  await prisma.document.update({
    where: { id: sourceId },
    data: { status: "PROCESSING" },
  });

  try {
    const apiKey = process.env.TAVILY_API_KEY;
    if (!apiKey) throw new Error("TAVILY_API_KEY is not set");

    const tvly = tavily({ apiKey });
    const res = await tvly.extract([url]);
    const results = res.results ?? [];
    if (!results.length) throw new Error("No content extracted from URL");

    const rawContent = results
      .map((r) => r.rawContent || "")
      .filter(Boolean)
      .join("\n\n");

    if (!rawContent.trim()) throw new Error("Extracted content is empty");

    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });

    const chunks = await splitter.createDocuments(
      [rawContent],
      [
        {
          source: "website",
          url,
          document_id: sourceId,
          ...(threadId ? { thread_id: threadId } : {}),
        },
      ],
    );

    await storeDocuments(chunks);

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
