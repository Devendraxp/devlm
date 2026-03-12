"use client";

import React from "react";
import Link from "next/link";
import { Spotlight } from "@/components/ui/spotlight-new";
import { Button } from "@/components/ui/button";
import { MessageSquare, FileText, Globe, Zap, ArrowRight } from "lucide-react";
import { authClient } from "@/lib/auth-client";

const features = [
  {
    icon: <MessageSquare className="size-5" />,
    title: "Context-Aware Chat",
    description: "AI that remembers your entire conversation and understands your codebase.",
  },
  {
    icon: <FileText className="size-5" />,
    title: "Document Indexing",
    description: "Index PDFs, docs, code repos, and more for intelligent retrieval.",
  },
  {
    icon: <Globe className="size-5" />,
    title: "Web Search",
    description: "Real-time web search integration for up-to-date answers.",
  },
  {
    icon: <Zap className="size-5" />,
    title: "Lightning Fast",
    description: "Powered by cutting-edge LLMs with streaming responses.",
  },
];

export default function HomePage() {
  const { data: session } = authClient.useSession();

  return (
    <div className="flex flex-col">
      <section className="relative flex min-h-[calc(100vh-3.5rem)] items-center justify-center overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,var(--color-primary)/0.08,transparent_70%)]" />
        <Spotlight />
        <div className="relative z-10 mx-auto max-w-4xl px-4 py-20 text-center sm:px-6 lg:px-8">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/50 px-4 py-1.5 text-sm text-muted-foreground backdrop-blur-sm">
            <Zap className="size-3.5 text-primary" />
            private
          </div>

          <h1 className="font-heading text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
            AI assistant
            <br />
            <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              that understands every file and link.
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-base text-muted-foreground sm:text-lg">
            You can attach Docs, PDFs, PPTs, Long paragraphs, or can paste link of WebSite, GitHub repo, YouTube video or any URL, it can understand everything with or without (strict mode) it's own knowledge.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            {session?.user ? (
              <Button size="lg" asChild>
                <Link href="/chat">
                  Open Chat
                  <ArrowRight className="ml-1 size-4" />
                </Link>
              </Button>
            ) : (
              <>
                <Button size="lg" asChild>
                  <Link href="/signup">
                    Get Started Free
                    <ArrowRight className="ml-1 size-4" />
                  </Link>
                </Button>
                <Button variant="outline" size="lg" asChild>
                  <Link href="/login">Sign In</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </section>

    </div>
  );
}

