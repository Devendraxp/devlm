"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  MessageSquarePlus,
  MessagesSquare,
  PanelLeftClose,
  Search,
} from "lucide-react";

interface Thread {
  id: string;
  title: string;
  updatedAt: string;
}

function formatRelative(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(date).toLocaleDateString();
}

export function ChatSidebar({
  isCollapsed,
  onToggle,
  activeThreadId,
  onSelectThread,
  onNewThread,
  threads,
  setThreads,
}: {
  isCollapsed: boolean;
  onToggle: () => void;
  activeThreadId: string | null;
  onSelectThread: (id: string) => void;
  onNewThread: (thread: Thread) => void;
  threads: Thread[];
  setThreads: React.Dispatch<React.SetStateAction<Thread[]>>;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [creating, setCreating] = useState(false);

  const handleNewThread = async () => {
    setCreating(true);
    try {
      const res = await fetch("/api/threads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "New Thread" }),
      });
      const data = await res.json();
      if (data.thread) {
        const newThread: Thread = {
          id: data.thread.id,
          title: data.thread.title,
          updatedAt: data.thread.updatedAt,
        };
        setThreads((prev) => [newThread, ...prev]);
        onNewThread(newThread);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setCreating(false);
    }
  };

  const filteredThreads = threads.filter((t) =>
    t.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <aside
      className={cn(
        "flex h-full flex-col border-r border-border bg-card/50 transition-all duration-300 ease-in-out",
        isCollapsed ? "w-0 overflow-hidden opacity-0" : "w-72 opacity-100"
      )}
    >
      <div className="flex items-center justify-between px-3 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <MessagesSquare className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-heading text-base font-semibold tracking-tight">
            DevLM
          </span>
        </div>
        <Button variant="ghost" size="icon-sm" onClick={onToggle}>
          <PanelLeftClose className="h-4 w-4" />
        </Button>
      </div>

      <div className="px-3 pb-2">
        <Button
          className="w-full justify-start gap-2 rounded-xl"
          variant="outline"
          onClick={handleNewThread}
          disabled={creating}
        >
          <MessageSquarePlus className="h-4 w-4" />
          {creating ? "Creating..." : "New Thread"}
        </Button>
      </div>

      <div className="px-3 pb-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search threads..."
            className="w-full rounded-lg border border-border bg-background py-1.5 pl-8 pr-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/20"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-2">
        <p className="px-2 pb-1.5 pt-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Recent
        </p>
        <div className="space-y-0.5">
          {filteredThreads.map((thread) => (
            <button
              key={thread.id}
              onClick={() => onSelectThread(thread.id)}
              className={cn(
                "group flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm transition-colors",
                thread.id === activeThreadId
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <MessagesSquare className="h-3.5 w-3.5 shrink-0 opacity-60" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium leading-tight">
                  {thread.title}
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {formatRelative(thread.updatedAt)}
                </p>
              </div>
            </button>
          ))}
          {filteredThreads.length === 0 && (
            <p className="px-2.5 py-4 text-center text-xs text-muted-foreground">
              No threads yet. Create one above.
            </p>
          )}
        </div>
      </div>
    </aside>
  );
}

