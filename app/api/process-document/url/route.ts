import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { websiteIndexing } from "@/rag/websiteIndexing";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 120;
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { url, threadId } = await req.json();

  if (!url?.trim()) {
    return NextResponse.json({ error: "url is required" }, { status: 400 });
  }

  const doc = await prisma.document.create({
    data: {
      userId: session.user.id,
      fileName: url,
      fileType: "url",
      fileUrl: url,
      sizeBytes: 0,
      status: "PENDING",
    },
  });

  try {
    await websiteIndexing(url, doc.id, threadId);

    if (threadId) {
      const thread = await prisma.thread.findFirst({
        where: { id: threadId, userId: session.user.id },
      });
      if (thread) {
        await prisma.threadDocument.upsert({
          where: { threadId_documentId: { threadId, documentId: doc.id } },
          create: { threadId, documentId: doc.id },
          update: {},
        });
      }
    }

    return NextResponse.json({ documentId: doc.id });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
