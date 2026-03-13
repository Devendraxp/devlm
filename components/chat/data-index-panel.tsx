"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  FileText,
  Type,
  Globe,
  Github,
  X,
  PanelRightClose,
  Plus,
  Link,
  CheckCircle2,
  Loader2,
  Youtube,
  Network,
} from "lucide-react";
import { UploadButton } from "@/lib/uploadthing";
import { toast } from "sonner";

type SourceType = "document" | "text" | "url" | "github" | "youtube" | "crawl";

interface IndexedSource {
  id: string;
  type: SourceType;
  name: string;
  status: "indexed" | "pending" | "processing" | "failed";
}

const FILE_TYPE_TO_SOURCE: Record<string, SourceType> = {
  pdf: "document",
  docx: "document",
  pptx: "document",
  text: "text",
  url: "url",
  github: "github",
  youtube: "youtube",
  crawl: "crawl",
};

export function DataIndexPanel({
  isCollapsed,
  onToggle,
  threadId,
}: {
  isCollapsed: boolean;
  onToggle: () => void;
  threadId: string | null;
}) {
  const [sources, setSources] = useState<IndexedSource[]>([]);
  const [textInput, setTextInput] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const [githubInput, setGithubInput] = useState("");
  const [youtubeInput, setYoutubeInput] = useState("");
  const [crawlUrl, setCrawlUrl] = useState("");
  const [crawlInstruction, setCrawlInstruction] = useState("");
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [textLoading, setTextLoading] = useState(false);
  const [urlLoading, setUrlLoading] = useState(false);
  const [githubLoading, setGithubLoading] = useState(false);
  const [youtubeLoading, setYoutubeLoading] = useState(false);
  const [crawlLoading, setCrawlLoading] = useState(false);

  // Load indexed documents when threadId changes
  useEffect(() => {
    if (!threadId) {
      setSources([]);
      return;
    }
    let cancelled = false;
    fetch(`/api/threads/${threadId}/documents`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const docs: { id: string; name: string; fileType: string; status: string }[] =
          data.documents ?? [];
        setSources(
          docs.map((d) => ({
            id: d.id,
            type: FILE_TYPE_TO_SOURCE[d.fileType] ?? "document",
            name: d.name,
            status: d.status === "indexed" ? "indexed" : d.status === "failed" ? "failed" : "processing",
          })),
        );
      })
      .catch(console.error);
    return () => {
      cancelled = true;
    };
  }, [threadId]);

  const removeSource = (id: string) => {
    setSources(sources.filter((s) => s.id !== id));
  };

  const toggleCard = (card: string) => {
    setExpandedCard(expandedCard === card ? null : card);
  };

  const processDocument = async (documentId: string, _name: string, _type: SourceType) => {
    setSources((prev) =>
      prev.map((s) => (s.id === documentId ? { ...s, status: "processing" } : s))
    );
    try {
      const res = await fetch("/api/process-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId, threadId }),
      });

      if (res.ok) {
        setSources((prev) =>
          prev.map((s) => (s.id === documentId ? { ...s, status: "indexed" } : s))
        );
        toast.success("Document indexed successfully");
      } else {
        const errorData = await res.json().catch(() => ({}));
        const errorMessage = errorData.error || "Failed to process document";
        setSources((prev) =>
          prev.map((s) => (s.id === documentId ? { ...s, status: "failed" } : s))
        );
        toast.error(errorMessage);
      }
    } catch {
      setSources((prev) =>
        prev.map((s) => (s.id === documentId ? { ...s, status: "failed" } : s))
      );
      toast.error("An unexpected error occurred while processing document");
    }
  };

  const handleAddText = async () => {
    if (!textInput.trim()) return;
    const name = textInput.slice(0, 40) + (textInput.length > 40 ? "…" : "");
    setTextLoading(true);
    try {
      const res = await fetch("/api/process-document/text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: textInput, threadId }),
      });
      if (res.ok) {
        const data = await res.json();
        setSources((prev) => [
          ...prev,
          { id: data.documentId, type: "text", name, status: "indexed" },
        ]);
        setTextInput("");
        toast.success("Text indexed successfully");
      } else {
        const errorData = await res.json().catch(() => ({}));
        const errorMessage = errorData.error || "Failed to index text";
        toast.error(errorMessage);
      }
    } catch (e) {
      console.error(e);
      toast.error("An unexpected error occurred");
    } finally {
      setTextLoading(false);
    }
  };

  const handleAddUrl = async () => {
    if (!urlInput.trim()) return;
    const name = urlInput.replace(/^https?:\/\//, "").slice(0, 50);
    setUrlLoading(true);
    const tempId = `url-${Date.now()}`;
    setSources((prev) => [...prev, { id: tempId, type: "url", name, status: "processing" }]);
    try {
      const res = await fetch("/api/process-document/url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: urlInput, threadId }),
      });
      if (res.ok) {
        const data = await res.json();
        setSources((prev) =>
          prev.map((s) => (s.id === tempId ? { ...s, id: data.documentId, status: "indexed" } : s))
        );
        setUrlInput("");
        toast.success("URL indexed successfully");
      } else {
        const errorData = await res.json().catch(() => ({}));
        const errorMessage = errorData.error || "Failed to index URL";
        setSources((prev) =>
          prev.map((s) => (s.id === tempId ? { ...s, status: "failed" } : s))
        );
        toast.error(errorMessage);
      }
    } catch (e) {
      console.error(e);
      setSources((prev) =>
        prev.map((s) => (s.id === tempId ? { ...s, status: "failed" } : s))
      );
      toast.error("An unexpected error occurred");
    } finally {
      setUrlLoading(false);
    }
  };

  const handleAddYoutube = async () => {
    if (!youtubeInput.trim()) return;
    const name = `YT: ${youtubeInput
      .replace(/^https?:\/\/(www\.)?youtube\.com\/watch\?v=/, "")
      .slice(0, 30)}`;
    setYoutubeLoading(true);
    const tempId = `yt-${Date.now()}`;
    setSources((prev) => [
      ...prev,
      { id: tempId, type: "youtube", name, status: "processing" },
    ]);
    try {
      const res = await fetch("/api/process-document/youtube", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: youtubeInput, threadId }),
      });
      if (res.ok) {
        const data = await res.json();
        setSources((prev) =>
          prev.map((s) =>
            s.id === tempId ? { ...s, id: data.documentId, status: "indexed" } : s
          )
        );
        setYoutubeInput("");
        toast.success("YouTube video indexed successfully");
      } else {
        const errorData = await res.json().catch(() => ({}));
        const errorMessage = errorData.error || "Failed to index YouTube video";
        setSources((prev) =>
          prev.map((s) => (s.id === tempId ? { ...s, status: "failed" } : s))
        );
        toast.error(errorMessage);
      }
    } catch (e) {
      console.error(e);
      setSources((prev) =>
        prev.map((s) => (s.id === tempId ? { ...s, status: "failed" } : s))
      );
      toast.error("An unexpected error occurred");
    } finally {
      setYoutubeLoading(false);
    }
  };

  const handleAddGithub = async () => {
    if (!githubInput.trim()) return;
    const name = githubInput
      .replace(/^https?:\/\/github\.com\//, "")
      .replace(/\/$/, "")
      .slice(0, 40);
    setGithubLoading(true);
    const tempId = `gh-${Date.now()}`;
    setSources((prev) => [
      ...prev,
      { id: tempId, type: "github", name, status: "processing" },
    ]);
    try {
      const res = await fetch("/api/process-document/github", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: githubInput, threadId }),
      });
      if (res.ok) {
        const data = await res.json();
        setSources((prev) =>
          prev.map((s) =>
            s.id === tempId ? { ...s, id: data.documentId, status: "indexed" } : s
          )
        );
        setGithubInput("");
        toast.success("GitHub repository indexed successfully");
      } else {
        const errorData = await res.json().catch(() => ({}));
        const errorMessage = errorData.error || "Failed to index GitHub repository";
        setSources((prev) =>
          prev.map((s) => (s.id === tempId ? { ...s, status: "failed" } : s))
        );
        toast.error(errorMessage);
      }
    } catch (e) {
      console.error(e);
      setSources((prev) =>
        prev.map((s) => (s.id === tempId ? { ...s, status: "failed" } : s))
      );
      toast.error("An unexpected error occurred");
    } finally {
      setGithubLoading(false);
    }
  };

  const handleAddCrawl = async () => {
    if (!crawlUrl.trim()) return;
    const name = `Crawl: ${crawlUrl.replace(/^https?:\/\//, "").slice(0, 38)}`;
    setCrawlLoading(true);
    const tempId = `crawl-${Date.now()}`;
    setSources((prev) => [
      ...prev,
      { id: tempId, type: "crawl", name, status: "processing" },
    ]);
    try {
      const res = await fetch("/api/process-document/crawl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: crawlUrl,
          instruction: crawlInstruction || undefined,
          threadId,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setSources((prev) =>
          prev.map((s) =>
            s.id === tempId ? { ...s, id: data.documentId, status: "indexed" } : s
          )
        );
        setCrawlUrl("");
        setCrawlInstruction("");
        toast.success("Crawl started/processed successfully");
      } else {
        const errorData = await res.json().catch(() => ({}));
        const errorMessage = errorData.error || "Failed to start crawl";
        setSources((prev) =>
          prev.map((s) => (s.id === tempId ? { ...s, status: "failed" } : s))
        );
        toast.error(errorMessage);
      }
    } catch (e) {
      console.error(e);
      setSources((prev) =>
        prev.map((s) => (s.id === tempId ? { ...s, status: "failed" } : s))
      );
      toast.error("An unexpected error occurred");
    } finally {
      setCrawlLoading(false);
    }
  };

  return (
    <aside
      className={cn(
        "flex h-full flex-col border-l border-border bg-card/50 transition-all duration-300 ease-in-out",
        isCollapsed ? "w-0 overflow-hidden opacity-0" : "w-80 opacity-100"
      )}
    >
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-border px-3">
        <h2 className="font-heading text-sm font-semibold tracking-tight">Sources</h2>
        <Button variant="ghost" size="icon-sm" onClick={onToggle}>
          <PanelRightClose className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {/* Document Upload */}
        <SourceCard
          icon={<FileText className="h-4 w-4" />}
          title="Upload Documents"
          description="PDF, DOCX, or PPTX files"
          expanded={expandedCard === "upload"}
          onToggle={() => toggleCard("upload")}
        >
          <div className="mt-3">
            <UploadButton
              endpoint="documentUploader"
              onClientUploadComplete={(res) => {
                res.forEach((file) => {
                  const docId = (file.serverData as { documentId?: string })?.documentId;
                  if (!docId) return;
                  const newSource: IndexedSource = {
                    id: docId,
                    type: "document",
                    name: file.name,
                    status: "pending",
                  };
                  setSources((prev) => [...prev, newSource]);
                  processDocument(docId, file.name, "document");
                });
                toast.success("File uploaded successfully");
              }}
              onUploadError={(error) => {
                console.error("Upload error:", error.message);
                toast.error(`Upload failed: ${error.message}`);
              }}
              appearance={{
                button:
                  "w-full rounded-xl border-2 border-dashed border-border bg-background p-5 text-sm font-medium text-muted-foreground hover:border-primary/40 hover:bg-accent/20 ut-uploading:cursor-not-allowed ut-uploading:opacity-60",
                allowedContent: "hidden",
              }}
              content={{
                button({ ready }) {
                  return ready
                    ? "Drop files or click to browse (PDF, DOCX, PPTX up to 16MB)"
                    : "Loading...";
                },
              }}
            />
          </div>
        </SourceCard>

        {/* Paste Text */}
        <SourceCard
          icon={<Type className="h-4 w-4" />}
          title="Paste Text"
          description="Add text content directly"
          expanded={expandedCard === "text"}
          onToggle={() => toggleCard("text")}
        >
          <div className="mt-3 space-y-2">
            <textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Paste your text here..."
              className="w-full rounded-lg border border-border bg-background p-2.5 text-sm resize-none outline-none transition-colors placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/20"
              rows={4}
            />
            <Button
              size="sm"
              className="w-full gap-1.5"
              disabled={!textInput.trim() || textLoading}
              onClick={handleAddText}
            >
              {textLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Plus className="h-3.5 w-3.5" />
              )}
              Add Text
            </Button>
          </div>
        </SourceCard>

        {/* Web Page — Tavily extract */}
        <SourceCard
          icon={<Globe className="h-4 w-4" />}
          title="Web Page"
          description="Index content from a webpage"
          expanded={expandedCard === "url"}
          onToggle={() => toggleCard("url")}
        >
          <div className="mt-3 space-y-2">
            <div className="relative">
              <Link className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://example.com/article"
                className="w-full rounded-lg border border-border bg-background py-2 pl-8 pr-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/20"
              />
            </div>
            <Button
              size="sm"
              className="w-full gap-1.5"
              disabled={!urlInput.trim() || urlLoading}
              onClick={handleAddUrl}
            >
              {urlLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Plus className="h-3.5 w-3.5" />
              )}
              Index Page
            </Button>
          </div>
        </SourceCard>

        {/* YouTube */}
        <SourceCard
          icon={<Youtube className="h-4 w-4" />}
          title="YouTube Video"
          description="Index video transcript"
          expanded={expandedCard === "youtube"}
          onToggle={() => toggleCard("youtube")}
        >
          <div className="mt-3 space-y-2">
            <div className="relative">
              <Youtube className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="url"
                value={youtubeInput}
                onChange={(e) => setYoutubeInput(e.target.value)}
                placeholder="https://youtube.com/watch?v=..."
                className="w-full rounded-lg border border-border bg-background py-2 pl-8 pr-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/20"
              />
            </div>
            <Button
              size="sm"
              className="w-full gap-1.5"
              disabled={!youtubeInput.trim() || youtubeLoading}
              onClick={handleAddYoutube}
            >
              {youtubeLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Plus className="h-3.5 w-3.5" />
              )}
              Index Video
            </Button>
          </div>
        </SourceCard>

        <SourceCard
          icon={<Network className="h-4 w-4" />}
          title="Deep Web Crawl"
          description="Crawl an entire website"
          expanded={expandedCard === "crawl"}
          onToggle={() => toggleCard("crawl")}
        >
          <div className="mt-3 space-y-2">
            <div className="relative">
              <Link className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="url"
                value={crawlUrl}
                onChange={(e) => setCrawlUrl(e.target.value)}
                placeholder="https://docs.example.com"
                className="w-full rounded-lg border border-border bg-background py-2 pl-8 pr-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/20"
              />
            </div>
            <input
              type="text"
              value={crawlInstruction}
              onChange={(e) => setCrawlInstruction(e.target.value)}
              placeholder="Optional: focus instruction (e.g. 'API docs only')"
              className="w-full rounded-lg border border-border bg-background py-2 px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/20"
            />
            <Button
              size="sm"
              className="w-full gap-1.5"
              disabled={!crawlUrl.trim() || crawlLoading}
              onClick={handleAddCrawl}
            >
              {crawlLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Network className="h-3.5 w-3.5" />
              )}
              Start Crawl
            </Button>
          </div>
        </SourceCard>

        {/* GitHub Repository */}
        <SourceCard
          icon={<Github className="h-4 w-4" />}
          title="GitHub Repository"
          description="Index a public repository"
          expanded={expandedCard === "github"}
          onToggle={() => toggleCard("github")}
        >
          <div className="mt-3 space-y-2">
            <div className="relative">
              <Github className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="url"
                value={githubInput}
                onChange={(e) => setGithubInput(e.target.value)}
                placeholder="https://github.com/user/repo"
                className="w-full rounded-lg border border-border bg-background py-2 pl-8 pr-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/20"
              />
            </div>
            <Button
              size="sm"
              className="w-full gap-1.5"
              disabled={!githubInput.trim() || githubLoading}
              onClick={handleAddGithub}
            >
              {githubLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Plus className="h-3.5 w-3.5" />
              )}
              Add Repository
            </Button>
          </div>
        </SourceCard>

        {sources.length > 0 && (
          <div className="pt-2">
            <p className="px-1 pb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Indexed Sources
            </p>
            <div className="space-y-1.5">
              {sources.map((source) => (
                <div
                  key={source.id}
                  className="flex items-center gap-2 rounded-lg border border-border bg-background p-2 text-sm"
                >
                  <SourceIcon type={source.type} />
                  <span className="min-w-0 flex-1 truncate text-xs">{source.name}</span>
                  {source.status === "processing" && (
                    <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-muted-foreground" />
                  )}
                  {source.status === "indexed" && (
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-primary" />
                  )}
                  {source.status === "failed" && (
                    <span className="text-[10px] text-destructive shrink-0">failed</span>
                  )}
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => removeSource(source.id)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}

function SourceCard({
  icon,
  title,
  description,
  expanded,
  onToggle,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border transition-colors",
        expanded && "bg-background"
      )}
    >
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-2.5 p-3 text-left"
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium leading-tight">{title}</p>
          <p className="text-[11px] text-muted-foreground">{description}</p>
        </div>
        <Plus
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
            expanded && "rotate-45"
          )}
        />
      </button>
      {expanded && <div className="px-3 pb-3">{children}</div>}
    </div>
  );
}

function SourceIcon({ type }: { type: SourceType }) {
  const iconClass = "h-3.5 w-3.5 text-muted-foreground";
  switch (type) {
    case "document":
      return <FileText className={iconClass} />;
    case "text":
      return <Type className={iconClass} />;
    case "url":
      return <Globe className={iconClass} />;
    case "github":
      return <Github className={iconClass} />;
    case "youtube":
      return <Youtube className={iconClass} />;
    case "crawl":
      return <Network className={iconClass} />;
  }
}

