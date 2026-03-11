"use client";

import { useRef, useEffect, useCallback, useMemo, type KeyboardEvent, type FormEvent } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { MessageCircle, Send, Square, Trash2, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useAssistant } from "./assistant-context";

export function AssistantPanel() {
  const { screenContext, isOpen, setIsOpen } = useAssistant();
  const screenContextRef = useRef(screenContext);
  screenContextRef.current = screenContext;

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/assistant/chat",
        body: () => ({ screenContext: screenContextRef.current }),
      }),
    []
  );

  const {
    messages,
    setMessages,
    sendMessage,
    stop,
    status,
  } = useChat({ transport });

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isLoading = status === "streaming" || status === "submitted";

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSend = useCallback(async () => {
    const text = inputRef.current?.value.trim();
    if (!text || isLoading) return;
    inputRef.current!.value = "";
    await sendMessage({ text });
  }, [isLoading, sendMessage]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Check if last assistant message has completed tool calls — reload to show changes
  const lastMsg = messages[messages.length - 1];
  const hasToolResults =
    (lastMsg?.role === "assistant" &&
    lastMsg.parts?.some(
      (p) =>
        p.type.startsWith("tool-") &&
        "state" in p &&
        (p.state === "done" || p.state === "output-available")
    )) ?? false;

  useEffect(() => {
    if (hasToolResults && status === "ready") {
      const timer = setTimeout(() => window.location.reload(), 1500);
      return () => clearTimeout(timer);
    }
  }, [hasToolResults, status]);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger
        render={
          <Button
            size="icon"
            className="fixed bottom-6 right-6 z-40 size-12 rounded-full shadow-lg"
          />
        }
      >
        <MessageCircle className="size-5" />
      </SheetTrigger>
      <SheetContent
        side="right"
        showCloseButton
        className="flex w-full flex-col sm:max-w-md"
      >
        <SheetHeader className="flex-row items-center justify-between gap-2 border-b pb-3">
          <SheetTitle>Assistant</SheetTitle>
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setMessages([])}
              className="mr-8"
            >
              <Trash2 className="size-4" />
            </Button>
          )}
        </SheetHeader>

        {screenContext && (
          <div className="mx-4 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
            {screenContext.summary}
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-4">
          {messages.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-sm text-muted-foreground text-center px-4">
                Ask me about the data on this screen — events, parameters,
                implementation details, or suggestions for improvement.
                {screenContext?.view === "workspace" &&
                  " I can also make changes for you."}
              </p>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              {messages.map((msg) => (
                <div key={msg.id}>
                  {msg.parts?.map((part, pi) => {
                    if (part.type === "text" && part.text.trim()) {
                      return (
                        <div
                          key={pi}
                          className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                              msg.role === "user"
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted"
                            }`}
                          >
                            <MessageContent content={part.text} />
                          </div>
                        </div>
                      );
                    }

                    if (part.type.startsWith("tool-") && "toolName" in part) {
                      const toolPart = part as unknown as {
                        type: string;
                        toolName: string;
                        input: Record<string, unknown>;
                        state: string;
                        output?: Record<string, unknown>;
                      };
                      return (
                        <ToolCallDisplay
                          key={pi}
                          name={toolPart.toolName}
                          args={toolPart.input ?? {}}
                          state={toolPart.state}
                          result={toolPart.output}
                        />
                      );
                    }

                    return null;
                  })}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        <div className="border-t p-4">
          <div className="flex gap-2">
            <textarea
              ref={inputRef}
              placeholder={
                screenContext?.view === "workspace"
                  ? "Ask or request changes..."
                  : "Ask about this screen..."
              }
              className="flex-1 resize-none rounded-md border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              rows={2}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
            />
            {isLoading ? (
              <Button
                type="button"
                size="icon"
                variant="outline"
                onClick={() => stop()}
                className="self-end"
              >
                <Square className="size-4" />
              </Button>
            ) : (
              <Button
                type="button"
                size="icon"
                onClick={handleSend}
                className="self-end"
              >
                <Send className="size-4" />
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

const TOOL_LABELS: Record<string, string> = {
  create_event: "Creating event",
  update_event: "Updating event",
  delete_event: "Deleting event",
  create_parameter: "Creating parameter",
  update_parameter: "Updating parameter",
  delete_parameter: "Deleting parameter",
};

function ToolCallDisplay({
  name,
  args,
  state,
  result,
}: {
  name: string;
  args: Record<string, unknown>;
  state: string;
  result?: Record<string, unknown>;
}) {
  const label = TOOL_LABELS[name] ?? name;
  const detail = (args.name as string) ?? "";
  const isRunning =
    state === "call" ||
    state === "input-streaming" ||
    state === "input-available" ||
    state === "streaming";
  const isDone =
    state === "done" || state === "output-available";
  const isError =
    state === "output-error" ||
    (isDone && result && "error" in result);

  return (
    <div className="my-2 mx-1">
      <div
        className={`flex items-center gap-2 rounded-md border-l-4 px-3 py-2 text-xs ${
          isError
            ? "border-l-red-500 bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400"
            : isDone
              ? "border-l-green-500 bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400"
              : "border-l-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400"
        }`}
      >
        <Wrench className="size-3.5 shrink-0" />
        <span className="font-medium">
          {label}
          {detail ? ` — ${detail}` : ""}
        </span>
        {isRunning && <span className="animate-pulse ml-auto">Running...</span>}
        {isDone && !isError && (
          <span className="ml-auto font-medium">Done</span>
        )}
        {isError && result && "error" in result && (
          <span className="ml-auto font-medium">
            {String((result as { error: string }).error)}
          </span>
        )}
      </div>
    </div>
  );
}

function MessageContent({ content }: { content: string }) {
  if (!content) {
    return <span className="animate-pulse text-muted-foreground">...</span>;
  }

  const parts = content.split(/(\*\*[^*]+\*\*|`[^`]+`|\n)/g);
  return (
    <span className="whitespace-pre-wrap">
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={i}>{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith("`") && part.endsWith("`")) {
          return (
            <code
              key={i}
              className="rounded bg-background/50 px-1 py-0.5 text-xs font-mono"
            >
              {part.slice(1, -1)}
            </code>
          );
        }
        return part;
      })}
    </span>
  );
}
