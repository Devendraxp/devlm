"use client";

import {
  UserMessageAttachments,
} from "@/components/assistant-ui/attachment";
import { MarkdownText } from "@/components/assistant-ui/markdown-text";
import { ToolFallback } from "@/components/assistant-ui/tool-fallback";
import { TooltipIconButton } from "@/components/assistant-ui/tooltip-icon-button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ActionBarPrimitive,
  AuiIf,
  BranchPickerPrimitive,
  ComposerPrimitive,
  ErrorPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
} from "@assistant-ui/react";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  BotIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CopyIcon,
  PanelLeftIcon,
  PanelRightIcon,
  RefreshCwIcon,
  ShieldIcon,
  SparklesIcon,
  SquareIcon,
  UserIcon,
} from "lucide-react";
import { type FC } from "react";

export function ChatThread({
  sidebarCollapsed,
  rightPanelCollapsed,
  onToggleSidebar,
  onToggleRightPanel,
  strictMode,
  onToggleStrictMode,
}: {
  sidebarCollapsed: boolean;
  rightPanelCollapsed: boolean;
  onToggleSidebar: () => void;
  onToggleRightPanel: () => void;
  strictMode: boolean;
  onToggleStrictMode: () => void;
}) {
  return (
    <ThreadPrimitive.Root
      className="flex h-full flex-1 flex-col bg-background"
      style={{ ["--thread-max-width" as string]: "48rem" }}
    >
      <ThreadPrimitive.Viewport className="relative flex flex-1 flex-col overflow-y-auto scroll-smooth px-4 pt-6">
        {/* Floating sidebar/panel toggles */}
        <div className="pointer-events-none sticky top-0 z-20 flex w-full items-center justify-between px-1 pt-1">
          <div className="pointer-events-auto">
            {sidebarCollapsed && (
              <Button variant="ghost" size="icon-sm" onClick={onToggleSidebar}>
                <PanelLeftIcon className="h-4 w-4" />
              </Button>
            )}
          </div>
          <div className="pointer-events-auto">
            {rightPanelCollapsed && (
              <Button variant="ghost" size="icon-sm" onClick={onToggleRightPanel}>
                <PanelRightIcon className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        <AuiIf condition={(s) => s.thread.isEmpty}>
          <ThreadWelcome />
        </AuiIf>

        <ThreadPrimitive.Messages
          components={{ UserMessage, EditComposer, AssistantMessage }}
        />

        <ThreadPrimitive.ViewportFooter className="sticky bottom-0 mx-auto mt-auto flex w-full max-w-(--thread-max-width) flex-col items-center gap-3 bg-gradient-to-t from-background via-background to-transparent pt-8 pb-4">
          <ThreadScrollToBottom />
          <ChatComposer
            strictMode={strictMode}
            onToggleStrictMode={onToggleStrictMode}
          />
        </ThreadPrimitive.ViewportFooter>
      </ThreadPrimitive.Viewport>
    </ThreadPrimitive.Root>
  );
}

const ThreadScrollToBottom: FC = () => {
  return (
    <ThreadPrimitive.ScrollToBottom asChild>
      <TooltipIconButton
        tooltip="Scroll to bottom"
        variant="outline"
        className="absolute -top-4 z-10 size-8 self-center rounded-full border border-border bg-background shadow-sm disabled:invisible"
      >
        <ArrowDownIcon className="h-4 w-4" />
      </TooltipIconButton>
    </ThreadPrimitive.ScrollToBottom>
  );
};

const ThreadWelcome: FC = () => {
  return (
    <div className="mx-auto my-auto flex w-full max-w-(--thread-max-width) grow flex-col items-center justify-center">
      <div className="flex flex-col items-center text-center px-4 pb-8">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
          <SparklesIcon className="h-7 w-7 text-primary" />
        </div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          What can I help you with?
        </h1>
        <p className="mt-2 max-w-md text-muted-foreground">
          Ask me anything, upload documents, or paste links to get started.
        </p>
      </div>
      <div className="grid w-full max-w-lg grid-cols-2 gap-2 px-4 pb-4">
        <WelcomeCard
          title="Explain a concept"
          subtitle="Break down complex topics"
        />
        <WelcomeCard
          title="Analyze a document"
          subtitle="Extract key insights"
        />
        <WelcomeCard
          title="Write code"
          subtitle="Generate or debug code"
        />
        <WelcomeCard
          title="Summarize content"
          subtitle="Get quick overviews"
        />
      </div>
    </div>
  );
};

function WelcomeCard({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <button className="flex flex-col gap-0.5 rounded-xl border border-border p-3 text-left transition-colors hover:bg-muted/50">
      <span className="text-sm font-medium">{title}</span>
      <span className="text-xs text-muted-foreground">{subtitle}</span>
    </button>
  );
}

const ChatComposer: FC<{
  strictMode: boolean;
  onToggleStrictMode: () => void;
}> = ({ strictMode, onToggleStrictMode }) => {
  return (
    <ComposerPrimitive.Root className="relative flex w-full flex-col rounded-2xl border border-input bg-card shadow-sm transition-shadow focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/20">
      <ComposerPrimitive.Input
        placeholder="Message DevLM..."
        className="min-h-[52px] w-full resize-none bg-transparent px-4 pt-3.5 pb-2 text-sm outline-none placeholder:text-muted-foreground"
        rows={1}
        autoFocus
      />
      <div className="flex items-center justify-between px-2.5 pb-2.5">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onToggleStrictMode}
            title="Strict Mode: answer only from uploaded documents"
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
              strictMode
                ? "bg-destructive/15 text-destructive ring-1 ring-destructive/30"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <ShieldIcon className="h-3.5 w-3.5" />
            Strict
          </button>
        </div>

        <div className="flex items-center gap-1">
          <AuiIf condition={(s) => !s.thread.isRunning}>
            <ComposerPrimitive.Send asChild>
              <Button
                size="icon-sm"
                className="rounded-full"
              >
                <ArrowUpIcon className="h-4 w-4" />
              </Button>
            </ComposerPrimitive.Send>
          </AuiIf>
          <AuiIf condition={(s) => s.thread.isRunning}>
            <ComposerPrimitive.Cancel asChild>
              <Button
                size="icon-sm"
                variant="outline"
                className="rounded-full"
              >
                <SquareIcon className="h-3 w-3 fill-current" />
              </Button>
            </ComposerPrimitive.Cancel>
          </AuiIf>
        </div>
      </div>
    </ComposerPrimitive.Root>
  );
};

const AssistantMessage: FC = () => {
  return (
    <MessagePrimitive.Root
      className="fade-in slide-in-from-bottom-1 relative mx-auto w-full max-w-(--thread-max-width) animate-in py-4 duration-150"
      data-role="assistant"
    >
      <div className="flex gap-3">
        <Avatar size="sm" className="mt-0.5 shrink-0">
          <AvatarFallback className="bg-primary/10 text-primary">
            <BotIcon className="h-3.5 w-3.5" />
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="mb-1 text-xs font-medium text-muted-foreground">
            DevLM
          </p>
          <div className="wrap-break-word text-foreground leading-relaxed">
            <MessagePrimitive.Parts
              components={{
                Text: MarkdownText,
                tools: { Fallback: ToolFallback },
              }}
            />
            <MessageError />
          </div>
          <div className="mt-2 flex items-center gap-1">
            <BranchPicker />
            <AssistantActionBar />
          </div>
        </div>
      </div>
    </MessagePrimitive.Root>
  );
};

const UserMessage: FC = () => {
  return (
    <MessagePrimitive.Root
      className="fade-in slide-in-from-bottom-1 mx-auto w-full max-w-(--thread-max-width) animate-in py-4 duration-150"
      data-role="user"
    >
      <div className="flex justify-end gap-3">
        <div className="max-w-[80%]">
          <UserMessageAttachments />
          <div className="wrap-break-word rounded-2xl bg-muted px-4 py-2.5 text-foreground">
            <MessagePrimitive.Parts />
          </div>
          <div className="mt-1 flex justify-end">
            <UserActionBar />
          </div>
        </div>
        <Avatar size="sm" className="mt-0.5 shrink-0">
          <AvatarFallback className="bg-secondary text-secondary-foreground">
            <UserIcon className="h-3.5 w-3.5" />
          </AvatarFallback>
        </Avatar>
      </div>
      <BranchPicker className="mt-1 justify-end" />
    </MessagePrimitive.Root>
  );
};

const MessageError: FC = () => {
  return (
    <MessagePrimitive.Error>
      <ErrorPrimitive.Root className="mt-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
        <ErrorPrimitive.Message className="line-clamp-2" />
      </ErrorPrimitive.Root>
    </MessagePrimitive.Error>
  );
};

const AssistantActionBar: FC = () => {
  return (
    <ActionBarPrimitive.Root
      hideWhenRunning
      autohide="not-last"
      className="flex gap-0.5 text-muted-foreground"
    >
      <ActionBarPrimitive.Copy asChild>
        <TooltipIconButton tooltip="Copy">
          <AuiIf condition={(s) => s.message.isCopied}>
            <CheckIcon />
          </AuiIf>
          <AuiIf condition={(s) => !s.message.isCopied}>
            <CopyIcon />
          </AuiIf>
        </TooltipIconButton>
      </ActionBarPrimitive.Copy>
      <ActionBarPrimitive.Reload asChild>
        <TooltipIconButton tooltip="Regenerate">
          <RefreshCwIcon />
        </TooltipIconButton>
      </ActionBarPrimitive.Reload>
    </ActionBarPrimitive.Root>
  );
};

const UserActionBar: FC = () => {
  return (
    <ActionBarPrimitive.Root
      hideWhenRunning
      autohide="not-last"
      className="flex items-center text-muted-foreground"
    >
      <ActionBarPrimitive.Copy asChild>
        <TooltipIconButton tooltip="Copy">
          <AuiIf condition={(s) => s.message.isCopied}>
            <CheckIcon />
          </AuiIf>
          <AuiIf condition={(s) => !s.message.isCopied}>
            <CopyIcon />
          </AuiIf>
        </TooltipIconButton>
      </ActionBarPrimitive.Copy>
    </ActionBarPrimitive.Root>
  );
};

const EditComposer: FC = () => {
  return (
    <MessagePrimitive.Root className="mx-auto flex w-full max-w-(--thread-max-width) flex-col px-2 py-3">
      <ComposerPrimitive.Root className="ml-auto flex w-full max-w-[80%] flex-col rounded-2xl bg-muted">
        <ComposerPrimitive.Input
          className="min-h-14 w-full resize-none bg-transparent p-4 text-sm text-foreground outline-none"
          autoFocus
        />
        <div className="mx-3 mb-3 flex items-center gap-2 self-end">
          <ComposerPrimitive.Cancel asChild>
            <Button variant="ghost" size="sm">
              Cancel
            </Button>
          </ComposerPrimitive.Cancel>
          <ComposerPrimitive.Send asChild>
            <Button size="sm">Update</Button>
          </ComposerPrimitive.Send>
        </div>
      </ComposerPrimitive.Root>
    </MessagePrimitive.Root>
  );
};

const BranchPicker: FC<BranchPickerPrimitive.Root.Props> = ({
  className,
  ...rest
}) => {
  return (
    <BranchPickerPrimitive.Root
      hideWhenSingleBranch
      className={cn(
        "inline-flex items-center text-xs text-muted-foreground",
        className
      )}
      {...rest}
    >
      <BranchPickerPrimitive.Previous asChild>
        <TooltipIconButton tooltip="Previous">
          <ChevronLeftIcon />
        </TooltipIconButton>
      </BranchPickerPrimitive.Previous>
      <span className="font-medium">
        <BranchPickerPrimitive.Number /> / <BranchPickerPrimitive.Count />
      </span>
      <BranchPickerPrimitive.Next asChild>
        <TooltipIconButton tooltip="Next">
          <ChevronRightIcon />
        </TooltipIconButton>
      </BranchPickerPrimitive.Next>
    </BranchPickerPrimitive.Root>
  );
};
