import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { indexPDF } from "@/rag/pdfIndexing";
import { docxIndexing } from "@/rag/docxIndexing";
import { pptIndexing } from "@/rag/pptIndexing";
import { textIndexing } from "@/rag/textIndexing";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { writeFile, unlink, mkdir } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";

export const maxDuration = 300;
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { documentId, threadId } = body as {
    documentId: string;
    threadId?: string;
  };

  if (!documentId) {
    return NextResponse.json({ error: "documentId is required" }, { status: 400 });
  }

  const document = await prisma.document.findFirst({
    where: { id: documentId, userId: session.user.id },
  });

  if (!document) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  if (!document.fileUrl) {
    return NextResponse.json({ error: "Document has no file URL" }, { status: 400 });
  }

  if (document.status === "INDEXED") {
    // Already indexed — just link to thread if needed and return
    if (threadId) {
      await linkDocumentToThread(documentId, threadId, session.user.id);
    }
    return NextResponse.json({ success: true, documentId });
  }

  // Download file to tmp
  const tmpDir = join(tmpdir(), "devlm-uploads");
  await mkdir(tmpDir, { recursive: true });
  const tmpPath = join(tmpDir, `${documentId}-${document.fileName}`);

  try {
    const res = await fetch(document.fileUrl);
    if (!res.ok) {
      throw new Error(`Failed to download file: ${res.status}`);
    }
    const buffer = Buffer.from(await res.arrayBuffer());
    await writeFile(tmpPath, buffer);

    // Index by file type
    const fileType = document.fileType.toLowerCase();
    if (fileType === "pdf") {
      await indexPDF(tmpPath, documentId, threadId);
    } else if (fileType === "docx" || fileType === "doc") {
      await docxIndexing(tmpPath, documentId, threadId);
    } else if (fileType === "pptx" || fileType === "ppt") {
      await pptIndexing(tmpPath, documentId, threadId);
    } else if (fileType === "txt") {
      const text = buffer.toString("utf-8");
      await textIndexing(text, documentId, threadId);
    } else {
      return NextResponse.json(
        { error: `Unsupported file type: ${fileType}` },
        { status: 400 }
      );
    }

    // Link to thread if provided
    if (threadId) {
      await linkDocumentToThread(documentId, threadId, session.user.id);
    }

    return NextResponse.json({ success: true, documentId });
  } finally {
    // Clean up temp file
    await unlink(tmpPath).catch(() => {});
  }
}

async function linkDocumentToThread(
  documentId: string,
  threadId: string,
  userId: string
) {
  // Verify thread belongs to user
  const thread = await prisma.thread.findFirst({
    where: { id: threadId, userId },
  });
  if (!thread) return;

  await prisma.threadDocument.upsert({
    where: { threadId_documentId: { threadId, documentId } },
    create: { threadId, documentId },
    update: {},
  });
}
