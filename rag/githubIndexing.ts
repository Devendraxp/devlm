import "dotenv/config";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { storeDocuments } from "@/rag/vectorStore";
import { GithubRepoLoader } from "@langchain/community/document_loaders/web/github";
import { prisma } from "@/lib/prisma";
export const maxDuration = 300;
export const runtime = "nodejs";

export async function githubIndexing(url: string, sourceId: string, threadId?: string) {
  await prisma.document.update({
    where: { id: sourceId },
    data: { status: "PROCESSING" },
  });

  try {
    const loader = new GithubRepoLoader(url, {
      branch: "main",
      recursive: true,
      unknown: "warn",
      maxConcurrency: 2,
      accessToken: process.env.GITHUB_ACCESS_TOKEN,
      ignorePaths: [
        "**/node_modules/**",
        "**/.git/**",
        "**/dist/**",
        "**/build/**",
        "**/.next/**",
        "**/*.lock",
        "**/*.png",
        "**/*.jpg",
        "**/*.jpeg",
        "**/*.svg",
        "**/*.ico",
        "**/*.wasm",
        "**/*.exe",
        "**/*.bin",
        "**/*.pdf",
      ],
    });

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
        source: "github",
        repoUrl: url,
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
