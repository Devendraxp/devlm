import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@/generated/prisma/enums";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

// GET /api/threads/[threadId]/messages
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ threadId: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { threadId } = await params;

  // Verify thread belongs to this user
  const thread = await prisma.thread.findFirst({
    where: { id: threadId, userId: session.user.id },
  });

  if (!thread) {
    return NextResponse.json({ error: "Thread not found" }, { status: 404 });
  }

  const messages = await prisma.message.findMany({
    where: { threadId },
    orderBy: { createdAt: "asc" },
    select: { id: true, role: true, content: true, createdAt: true },
  });

  return NextResponse.json({ messages });
}

// POST /api/threads/[threadId]/messages — save messages to thread
export async function POST(
  req: NextRequest,
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

  const body = await req.json();
  const messages: { role: string; content: string }[] = body.messages ?? [];

  const roleMap: Record<string, Role> = {
    user: Role.USER,
    assistant: Role.ASSISTANT,
    system: Role.SYSTEM,
  };

  const validMessages = messages.filter(
    (m) => m.content?.trim() && roleMap[m.role?.toLowerCase()]
  );

  if (validMessages.length > 0) {
    await prisma.message.createMany({
      data: validMessages.map((m) => ({
        threadId,
        role: roleMap[m.role.toLowerCase()],
        content: m.content.trim(),
        tokenCount: 0,
      })),
    });
  }

  return NextResponse.json({ success: true });
}
