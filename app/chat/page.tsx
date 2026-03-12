"use client";

import { useState, useRef, useMemo, useCallback, useEffect } from "react";
import { useChat } from "@ai-sdk/react";
import { useAISDKRuntime } from "@assistant-ui/react-ai-sdk";
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { DefaultChatTransport } from "ai";
import type { UIMessage } from "ai";
import { ChatSidebar } from "@/components/chat/chat-sidebar";
import { ChatThread } from "@/components/chat/chat-thread";
import { DataIndexPanel } from "@/components/chat/data-index-panel";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { LogIn } from "lucide-react";
import Link from "next/link";

interface Thread {
  id: string;
  title: string;
  updatedAt: string;
}

export default function Chat() {
  const { data: session, isPending } = authClient.useSession();
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);
  const [strictMode, setStrictMode] = useState(false);
  const [webSearch, setWebSearch] = useState(false);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // Refs so the transport body function gets up-to-date values on each request
  const threadIdRef = useRef<string | null>(null);
  const strictModeRef = useRef(false);
  const webSearchRef = useRef(false);
  threadIdRef.current = activeThreadId;
  strictModeRef.current = strictMode;
  webSearchRef.current = webSearch;

  // Callback ref for when the API auto-creates a thread
  const onAutoThreadCreated = useCallback(
    (id: string, title: string) => {
      setActiveThreadId(id);
      threadIdRef.current = id;
      setThreads((prev) => {
        if (prev.some((t) => t.id === id)) return prev;
        return [{ id, title, updatedAt: new Date().toISOString() }, ...prev];
      });
    },
    [],
  );
  const onAutoThreadCreatedRef = useRef(onAutoThreadCreated);
  onAutoThreadCreatedRef.current = onAutoThreadCreated;

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        body: () => ({
          threadId: threadIdRef.current,
          strictMode: strictModeRef.current,
          webSearch: webSearchRef.current,
        }),
        fetch: async (input, init) => {
          const response = await globalThis.fetch(input, init);
          const newThreadId = response.headers.get("x-thread-id");
          const newThreadTitle = response.headers.get("x-thread-title");
          if (newThreadId && newThreadId !== threadIdRef.current) {
            onAutoThreadCreatedRef.current(
              newThreadId,
              newThreadTitle || "New Thread",
            );
          }
          return response;
        },
      }),
    [],
  );

  const chat = useChat({ transport });
  const runtime = useAISDKRuntime(chat);

  // Fetch threads on mount
  useEffect(() => {
    fetch("/api/threads")
      .then((r) => r.json())
      .then((data) => setThreads(data.threads ?? []))
      .catch(console.error);
  }, []);

  // Load messages when selecting an older thread
  const loadThreadMessages = useCallback(
    async (threadId: string) => {
      setLoadingMessages(true);
      try {
        const res = await fetch(`/api/threads/${threadId}/messages`);
        if (!res.ok) return;
        const data = await res.json();
        const dbMessages: { id: string; role: string; content: string }[] =
          data.messages ?? [];
        const uiMessages: UIMessage[] = dbMessages.map((m) => ({
          id: m.id,
          role: m.role.toLowerCase() as "user" | "assistant" | "system",
          content: m.content,
          parts: [{ type: "text" as const, text: m.content }],
        }));
        chat.setMessages(uiMessages);
      } catch (e) {
        console.error("Failed to load messages", e);
      } finally {
        setLoadingMessages(false);
      }
    },
    [chat],
  );

  const handleSelectThread = useCallback(
    (id: string) => {
      setActiveThreadId(id);
      setStrictMode(false);
      setWebSearch(false);
      loadThreadMessages(id);
    },
    [loadThreadMessages],
  );

  const handleNewThread = useCallback(
    (thread: Thread) => {
      setActiveThreadId(thread.id);
      chat.setMessages([]);
      setStrictMode(false);
      setWebSearch(false);
      setThreads((prev) => {
        if (prev.some((t) => t.id === thread.id)) return prev;
        return [thread, ...prev];
      });
    },
    [chat],
  );

  // Auth guard: show blurred page with login modal if not authenticated
  if (!isPending && !session?.user) {
    return (
      <AssistantRuntimeProvider runtime={runtime}>
        <div className="relative flex h-screen w-full overflow-hidden">
          {/* Blurred chat in background */}
          <div className="pointer-events-none select-none blur-md">
            <div className="flex h-screen w-full">
              <div className="flex h-full flex-1 flex-col items-center justify-center bg-background">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                  <LogIn className="h-7 w-7 text-primary" />
                </div>
                <h1 className="text-2xl font-semibold">What can I help you with?</h1>
                <p className="mt-2 text-muted-foreground">Ask me anything to get started.</p>
              </div>
            </div>
          </div>

          {/* Login modal overlay */}
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm">
            <div className="mx-4 flex w-full max-w-md flex-col items-center gap-6 rounded-2xl border border-border bg-card p-8 shadow-xl">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                <LogIn className="h-7 w-7 text-primary" />
              </div>
              <div className="text-center">
                <h2 className="text-xl font-semibold">Login Required</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  You have to login to access AI chat
                </p>
              </div>
              <div className="flex w-full flex-col gap-3 sm:flex-row">
                <Button className="flex-1" asChild>
                  <Link href="/login">Sign In</Link>
                </Button>
                <Button variant="outline" className="flex-1" asChild>
                  <Link href="/signup">Create Account</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </AssistantRuntimeProvider>
    );
  }

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <div className="flex h-screen w-full overflow-hidden">
        <ChatSidebar
          isCollapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
          activeThreadId={activeThreadId}
          onSelectThread={handleSelectThread}
          onNewThread={handleNewThread}
          threads={threads}
          setThreads={setThreads}
        />
        <ChatThread
          sidebarCollapsed={sidebarCollapsed}
          rightPanelCollapsed={rightPanelCollapsed}
          onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
          onToggleRightPanel={() => setRightPanelCollapsed(!rightPanelCollapsed)}
          strictMode={strictMode}
          onToggleStrictMode={() => setStrictMode(!strictMode)}
        />
        <DataIndexPanel
          isCollapsed={rightPanelCollapsed}
          onToggle={() => setRightPanelCollapsed(!rightPanelCollapsed)}
          threadId={activeThreadId}
        />
      </div>
    </AssistantRuntimeProvider>
  );
}
