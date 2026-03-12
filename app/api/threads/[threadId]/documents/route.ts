import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

// GET /api/threads/[threadId]/documents — list documents indexed for a thread
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ threadId: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { threadId } = await params;

  const thread = await prisma.thread.findFirst({
    where: { id: threadId, userId: session.user.id },
  });

  if (!thread) {
    return NextResponse.json({ error: "Thread not found" }, { status: 404 });
  }

  const threadDocs = await prisma.threadDocument.findMany({
    where: { threadId },
    include: {
      document: {
        select: { id: true, fileName: true, fileType: true, status: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const documents = threadDocs.map(({ document: doc }) => ({
    id: doc.id,
    name: doc.fileName,
    fileType: doc.fileType,
    status: doc.status.toLowerCase(),
  }));

  return NextResponse.json({ documents });
}
