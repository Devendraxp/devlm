import { streamText, UIMessage, convertToModelMessages, stepCountIs } from "ai";
import { groq } from "@ai-sdk/groq";
import { enhanceUserMessage, generateHyde, retrieveRAGData } from "@/rag/chat";
import { webSearchTool } from "@/tools/websearch";
import { extractWebPageTool } from "@/tools/extractWebPage";
import { crawlWebsiteTool } from "@/tools/crawlWebsite";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@/generated/prisma/enums";
import { headers } from "next/headers";

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
    });
  }

  const body = await req.json();
  const messages: UIMessage[] = await body.messages;
  const strictMode = body.strictMode ?? false;
  let threadId: string | null = body.threadId ?? null;

  const lastUserMessage = messages
    .filter((m) => m.role === "user")
    .slice(-1)[0];
  if (!lastUserMessage) {
    return new Response(JSON.stringify({ error: "No user message found" }), {
      status: 400,
    });
  }

  const userText = lastUserMessage.parts
    .filter((p): p is { type: "text"; text: string } => typeof p === "object" && "type" in p && p.type === "text")
    .map((p) => p.text)
    .join("\n") || String(lastUserMessage.parts ?? "");

  let threadTitle: string | null = null;
  if (!threadId) {
    threadTitle = userText.slice(0, 80) || "New Thread";
    const thread = await prisma.thread.create({
      data: {
        title: threadTitle,
        userId: session.user.id,
      },
    });
    threadId = thread.id;
  }

  await prisma.message.create({
    data: {
      threadId,
      role: Role.USER,
      content: userText,
      tokenCount: 0,
    },
  });

  const enhancedQuery = await enhanceUserMessage(userText);

  let ragContext = "";
  if (threadId) {
    const docCount = await prisma.threadDocument.count({ where: { threadId } });
    if (docCount > 0) {
      const hydeAnswer = await generateHyde(enhancedQuery);
      const ragData = await retrieveRAGData(
        `${enhancedQuery} \n ${hydeAnswer}`,
        threadId,
      );
      ragContext = ragData
        .map((doc, i) => `Source ${i + 1}:\n${doc.pageContent}`)
        .join("\n\n");
    }
  }

  const responseHeaders: Record<string, string> = {};
  if (threadId) {
    responseHeaders["X-Thread-Id"] = threadId;
  }
  if (threadTitle) {
    responseHeaders["X-Thread-Title"] = threadTitle;
  }

  const onFinish = async ({ text }: { text: string }) => {
    if (threadId && text) {
      await prisma.message.create({
        data: {
          threadId,
          role: Role.ASSISTANT,
          content: text,
          tokenCount: 0,
        },
      });
      await prisma.thread.update({
        where: { id: threadId },
        data: { updatedAt: new Date() },
      });
    }
  };

  if (strictMode) {
    const SYSTEM_PROMPT = `
    You are an assistant for answering questions based ONLY on retrieved data.

    Retrieved Context:
    ${ragContext}

    Rules:
    - Use ONLY the retrieved context to answer
    - If the answer is not present, say "I don't know"
    - Do not make assumptions
    - Be concise and factual

    Date and Time: ${new Date().toLocaleString()}
    `;

    const result = streamText({
      model: groq("openai/gpt-oss-20b"),
      messages: await convertToModelMessages(messages),
      system: SYSTEM_PROMPT,
      onFinish,
    });
    return result.toUIMessageStreamResponse({ headers: responseHeaders });
  }

  const SYSTEM_PROMPT = `
    You are an assistant for answering questions based on retrieved data, Your knowladge and tools.

    Retrieved Context:
    ${ragContext}

    Tools:
    - web search
    - extract webpage
    - crawl website

    Date and Time: ${new Date().toLocaleString()}
    `;

  const result = streamText({
    model: groq("openai/gpt-oss-20b"),
    messages: await convertToModelMessages(messages),
    system: SYSTEM_PROMPT,
    tools: { webSearchTool, extractWebPageTool, crawlWebsiteTool },
    stopWhen: stepCountIs(5),
    onFinish,
  });
  return result.toUIMessageStreamResponse({ headers: responseHeaders });
}

