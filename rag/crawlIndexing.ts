import "dotenv/config";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { storeDocuments } from "@/rag/vectorStore";
import { Document } from "@langchain/core/documents";
import { prisma } from "@/lib/prisma";

import { tavily } from "@tavily/core";

export const maxDuration = 300;
export const runtime = "nodejs";

export async function crawlIndexing(
  url: string,
  sourceId: string,
  threadId?: string,
  instruction?: string,
) {
  await prisma.document.update({
    where: { id: sourceId },
    data: { status: "PROCESSING" },
  });

  try {
    const apiKey = process.env.TAVILY_API_KEY;
    if (!apiKey) throw new Error("TAVILY_API_KEY is not set");

    const tvly = tavily({ apiKey });
    const crawlOptions = instruction ? { instruction } : {};
    const res = await tvly.crawl(url, crawlOptions);
    const results = res.results ?? [];

    if (!results.length) throw new Error("No pages crawled");

    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });

    const allChunks: Document[] = [];
    for (const page of results) {
      const content = page.rawContent || "";
      if (!content.trim()) continue;
      const pageChunks = await splitter.createDocuments(
        [content],
        [
          {
            source: "crawl",
            url: page.url ?? url,
            rootUrl: url,
            document_id: sourceId,
            ...(threadId ? { thread_id: threadId } : {}),
          },
        ],
      );
      allChunks.push(...(pageChunks as Document[]));
    }

    if (!allChunks.length) throw new Error("No content extracted from crawl");

    await storeDocuments(allChunks);

    await prisma.document.update({
      where: { id: sourceId },
      data: { status: "INDEXED" },
    });

    return { sourceId, pagesCrawled: results.length };
  } catch (error) {
    await prisma.document.update({
      where: { id: sourceId },
      data: { status: "FAILED" },
    });
    throw error;
  }
}
