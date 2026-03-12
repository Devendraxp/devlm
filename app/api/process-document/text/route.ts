import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { textIndexing } from "@/rag/textIndexing";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 120;
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { text, threadId } = await req.json();

  if (!text?.trim()) {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }

  const document = await prisma.document.create({
    data: {
      userId: session.user.id,
      fileName: `text-${Date.now()}.txt`,
      fileType: "txt",
      sizeBytes: Buffer.byteLength(text, "utf-8"),
      status: "PENDING",
    },
  });

  await textIndexing(text, document.id, threadId);

  if (threadId) {
    const thread = await prisma.thread.findFirst({
      where: { id: threadId, userId: session.user.id },
    });
    if (thread) {
      await prisma.threadDocument.upsert({
        where: { threadId_documentId: { threadId, documentId: document.id } },
        create: { threadId, documentId: document.id },
        update: {},
      });
    }
  }

  return NextResponse.json({ documentId: document.id });
}
