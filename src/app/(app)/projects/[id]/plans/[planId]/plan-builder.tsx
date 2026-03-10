"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Send,
  Loader2,
  Quote,
  FileText,
  MessageSquare,
  StickyNote,
  Globe,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { updatePlanDocument, updatePlanMessages } from "../actions";
import type { PlanMessage } from "@/types";

interface ContextSourceSummary {
  id: string;
  type: string;
  name: string;
  content: string;
}

interface ExistingEvent {
  id: string;
  name: string;
  description: string | null;
  trigger: string | null;
  category: string | null;
}

interface ExistingParameter {
  name: string;
  type: string;
  eventId: string;
  description: string | null;
}

interface PlanBuilderProps {
  projectId: string;
  planId: string;
  initialTitle: string;
  initialDocument: string;
  initialMessages: PlanMessage[];
  contextSources?: ContextSourceSummary[];
  existingEvents?: ExistingEvent[];
  existingParameters?: ExistingParameter[];
}

function parseDocumentFromResponse(text: string): {
  chatContent: string;
  document: string | null;
} {
  const docMatch = text.match(/<document>([\s\S]*?)<\/document>/);
  if (!docMatch) return { chatContent: text, document: null };
  const document = docMatch[1].trim();
  const chatContent = text.replace(/<document>[\s\S]*?<\/document>/, "").trim();
  return { chatContent, document };
}

// ── Mention types ───────────────────────────────────────────────────
interface MentionItem {
  type: "event" | "param" | "category" | "context";
  label: string;
  value: string; // what gets inserted
  detail?: string;
}

export function PlanBuilder({
  projectId,
  planId,
  initialTitle,
  initialDocument,
  initialMessages,
  contextSources = [],
  existingEvents = [],
  existingParameters = [],
}: PlanBuilderProps) {
  const [messages, setMessages] = useState<PlanMessage[]>(initialMessages);
  const [document, setDocument] = useState(initialDocument);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [selectedText, setSelectedText] = useState("");
  const [activePanel, setActivePanel] = useState<"chat" | "document">("chat");
  const [showContext, setShowContext] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const documentRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ── Autocomplete state ──────────────────────────────────────────
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionIndex, setMentionIndex] = useState(0);
  const [mentionStart, setMentionStart] = useState(0); // cursor pos where @ was typed
  const mentionRef = useRef<HTMLDivElement>(null);

  // Build event name lookup for parameter references
  const eventById = Object.fromEntries(
    existingEvents.map((e) => [e.id, e])
  );

  // Deduplicated categories
  const categories = [
    ...new Set(
      existingEvents.map((e) => e.category).filter(Boolean) as string[]
    ),
  ];

  // Build the mention items list
  const allMentionItems: MentionItem[] = [
    // Categories first (broad references)
    ...categories.map((cat) => ({
      type: "category" as const,
      label: cat,
      value: `@category:${cat}`,
      detail: `${existingEvents.filter((e) => e.category === cat).length} events`,
    })),
    // Events
    ...existingEvents.map((e) => ({
      type: "event" as const,
      label: e.name,
      value: `@event:${e.name}`,
      detail: [e.category, e.trigger].filter(Boolean).join(" / ") || undefined,
    })),
    // Parameters (shown as event.param)
    ...existingParameters.map((p) => {
      const event = eventById[p.eventId];
      return {
        type: "param" as const,
        label: event ? `${event.name}.${p.name}` : p.name,
        value: event
          ? `@param:${event.name}.${p.name}`
          : `@param:${p.name}`,
        detail: p.type,
      };
    }),
    // Context sources
    ...contextSources.map((s) => ({
      type: "context" as const,
      label: s.name,
      value: `@context:${s.name}`,
      detail: s.type,
    })),
  ];

  const filteredMentions =
    mentionQuery !== null
      ? allMentionItems.filter((m) =>
          m.label.toLowerCase().includes(mentionQuery.toLowerCase())
        )
      : [];

  function handleInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const val = e.target.value;
    const pos = e.target.selectionStart ?? val.length;
    setInput(val);

    // Check if we're in a @mention
    const textBeforeCursor = val.slice(0, pos);
    const atIndex = textBeforeCursor.lastIndexOf("@");
    if (
      atIndex >= 0 &&
      (atIndex === 0 || /\s/.test(textBeforeCursor[atIndex - 1]))
    ) {
      const query = textBeforeCursor.slice(atIndex + 1);
      // Only show if no space in query (single-word mention)
      if (!query.includes(" ") && !query.includes("\n")) {
        setMentionQuery(query);
        setMentionStart(atIndex);
        setMentionIndex(0);
        return;
      }
    }
    setMentionQuery(null);
  }

  function selectMention(item: MentionItem) {
    const before = input.slice(0, mentionStart);
    const after = input.slice(
      mentionStart + 1 + (mentionQuery?.length ?? 0)
    );
    setInput(`${before}${item.value} ${after}`);
    setMentionQuery(null);
    textareaRef.current?.focus();
  }

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const saveDocument = useCallback(
    async (doc: string) => {
      await updatePlanDocument(projectId, planId, doc);
    },
    [projectId, planId]
  );

  const saveMessages = useCallback(
    async (msgs: PlanMessage[]) => {
      await updatePlanMessages(projectId, planId, msgs);
    },
    [projectId, planId]
  );

  const handleDocumentMouseUp = useCallback(() => {
    const selection = window.getSelection();
    const text = selection?.toString().trim();
    if (text && text.length > 0) {
      setSelectedText(text);
    }
  }, []);

  const insertQuote = useCallback(() => {
    if (selectedText) {
      setInput(
        (prev) =>
          `${prev}${prev ? "\n\n" : ""}> ${selectedText.replace(/\n/g, "\n> ")}\n\n`
      );
      setSelectedText("");
      setActivePanel("chat");
      textareaRef.current?.focus();
    }
  }, [selectedText]);

  async function handleSend() {
    if (!input.trim() || isStreaming) return;

    const userMessage: PlanMessage = {
      role: "user",
      content: input.trim(),
      timestamp: new Date().toISOString(),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setIsStreaming(true);

    try {
      const response = await fetch("/api/plans/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages,
          document,
          contextSources,
          existingEvents,
        }),
      });

      if (!response.ok) throw new Error("Failed to get response");

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader");

      let fullResponse = "";
      const decoder = new TextDecoder();

      const assistantMessage: PlanMessage = {
        role: "assistant",
        content: "",
        timestamp: new Date().toISOString(),
      };
      setMessages([...newMessages, assistantMessage]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        fullResponse += chunk;

        const { chatContent, document: newDoc } =
          parseDocumentFromResponse(fullResponse);

        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            ...assistantMessage,
            content: chatContent,
          };
          return updated;
        });

        if (newDoc) {
          setDocument(newDoc);
        }
      }

      const { chatContent, document: finalDoc } =
        parseDocumentFromResponse(fullResponse);

      const finalAssistant: PlanMessage = {
        role: "assistant",
        content: chatContent,
        timestamp: new Date().toISOString(),
      };
      const finalMessages = [...newMessages, finalAssistant];
      setMessages(finalMessages);
      await saveMessages(finalMessages);

      if (finalDoc) {
        setDocument(finalDoc);
        await saveDocument(finalDoc);
      }
    } catch (error) {
      console.error("Streaming error:", error);
      setMessages(newMessages);
    } finally {
      setIsStreaming(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Handle autocomplete navigation
    if (mentionQuery !== null && filteredMentions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setMentionIndex((i) => (i + 1) % filteredMentions.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setMentionIndex(
          (i) => (i - 1 + filteredMentions.length) % filteredMentions.length
        );
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        selectMention(filteredMentions[mentionIndex]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setMentionQuery(null);
        return;
      }
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const hasContext = contextSources.length > 0 || existingEvents.length > 0;

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-2 shrink-0">
        <div className="flex items-center gap-2">
          <h1 className="font-semibold">{initialTitle}</h1>
          <Badge variant="secondary">draft</Badge>
          {hasContext && (
            <Badge variant="outline" className="text-xs">
              {contextSources.length + existingEvents.length} context sources
            </Badge>
          )}
        </div>
        <div className="flex gap-1 sm:hidden">
          <Button
            variant={activePanel === "chat" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActivePanel("chat")}
          >
            <MessageSquare className="size-4" />
          </Button>
          <Button
            variant={activePanel === "document" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActivePanel("document")}
          >
            <FileText className="size-4" />
          </Button>
        </div>
      </div>

      {/* Split pane */}
      <div className="flex flex-1 min-h-0">
        {/* Chat panel */}
        <div
          className={`flex flex-col w-full sm:w-1/2 sm:border-r ${
            activePanel === "chat" ? "flex" : "hidden sm:flex"
          }`}
        >
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Context summary (collapsible) */}
            {hasContext && messages.length === 0 && (
              <div className="rounded-md border bg-muted/30 p-3">
                <button
                  className="flex items-center gap-2 text-sm font-medium w-full text-left"
                  onClick={() => setShowContext(!showContext)}
                >
                  {showContext ? (
                    <ChevronDown className="size-4" />
                  ) : (
                    <ChevronRight className="size-4" />
                  )}
                  Context loaded
                  <span className="text-xs text-muted-foreground font-normal">
                    ({contextSources.length} sources
                    {existingEvents.length > 0 &&
                      `, ${existingEvents.length} existing events`}
                    )
                  </span>
                </button>
                {showContext && (
                  <div className="mt-2 space-y-1.5 pl-6">
                    {contextSources.map((s) => (
                      <div
                        key={s.id}
                        className="flex items-center gap-2 text-xs"
                      >
                        {s.type === "note" ? (
                          <StickyNote className="size-3 text-amber-500" />
                        ) : (
                          <Globe className="size-3 text-blue-500" />
                        )}
                        <span className="truncate">{s.name}</span>
                      </div>
                    ))}
                    {existingEvents.length > 0 && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <FileText className="size-3" />
                        <span>
                          {existingEvents.length} published events (
                          {existingEvents.map((e) => e.name).join(", ")})
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {messages.length === 0 && (
              <div className="text-center text-muted-foreground text-sm py-8">
                <p className="mb-2">
                  Start by describing what you want to measure.
                </p>
                <p className="text-xs">
                  {hasContext
                    ? "Your context has been loaded. The AI will use it to create a better plan."
                    : 'e.g., "I need a measurement plan for our e-commerce site. We want to track the full purchase funnel and user engagement."'}
                </p>
              </div>
            )}
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  {msg.content || <Loader2 className="size-4 animate-spin" />}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t p-3 shrink-0">
            {selectedText && (
              <div className="mb-2 flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={insertQuote}
                  className="text-xs"
                >
                  <Quote className="mr-1 size-3" />
                  Quote selection
                </Button>
                <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                  &quot;{selectedText}&quot;
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedText("")}
                  className="text-xs ml-auto"
                >
                  Dismiss
                </Button>
              </div>
            )}
            <div className="relative flex gap-2">
              {/* Mention autocomplete dropdown */}
              {mentionQuery !== null && filteredMentions.length > 0 && (
                <div
                  ref={mentionRef}
                  className="absolute bottom-full left-0 mb-1 w-72 max-h-48 overflow-y-auto rounded-md border bg-popover p-1 shadow-md z-50"
                >
                  {filteredMentions.map((item, i) => (
                    <button
                      key={item.value}
                      className={`flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-left ${
                        i === mentionIndex
                          ? "bg-accent text-accent-foreground"
                          : "hover:bg-accent/50"
                      }`}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        selectMention(item);
                      }}
                      onMouseEnter={() => setMentionIndex(i)}
                    >
                      <Badge
                        variant="outline"
                        className="text-[10px] px-1 py-0 shrink-0"
                      >
                        {item.type}
                      </Badge>
                      <span className="truncate font-medium">{item.label}</span>
                      {item.detail && (
                        <span className="ml-auto text-xs text-muted-foreground truncate">
                          {item.detail}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
              {mentionQuery !== null && filteredMentions.length === 0 && (
                <div className="absolute bottom-full left-0 mb-1 w-72 rounded-md border bg-popover p-3 shadow-md z-50">
                  <p className="text-xs text-muted-foreground">
                    No matches for &quot;@{mentionQuery}&quot;
                  </p>
                </div>
              )}
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder={
                  allMentionItems.length > 0
                    ? "Type @ to reference events or context..."
                    : "Describe your measurement needs..."
                }
                className="min-h-[44px] max-h-[120px] resize-none"
                rows={1}
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim() || isStreaming}
                size="icon"
                className="shrink-0"
              >
                {isStreaming ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Document panel */}
        <div
          ref={documentRef}
          onMouseUp={handleDocumentMouseUp}
          className={`flex flex-col w-full sm:w-1/2 ${
            activePanel === "document" ? "flex" : "hidden sm:flex"
          }`}
        >
          <div className="border-b px-4 py-2 flex items-center gap-2 shrink-0">
            <FileText className="size-4 text-muted-foreground" />
            <span className="text-sm font-medium">Plan Document</span>
            {selectedText && (
              <Badge variant="outline" className="text-xs ml-auto">
                Text selected — click Quote in chat
              </Badge>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-6">
            {document ? (
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <MarkdownRenderer content={document} />
              </div>
            ) : (
              <div className="text-center text-muted-foreground text-sm py-12">
                <FileText className="mx-auto size-10 mb-3 opacity-50" />
                <p>Your measurement plan will appear here</p>
                <p className="text-xs mt-1">
                  Start a conversation to build your plan
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Simple markdown renderer — handles headings, lists, bold, code blocks, tables
function MarkdownRenderer({ content }: { content: string }) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith("```")) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      i++;
      elements.push(
        <pre
          key={elements.length}
          className="bg-muted rounded-md p-3 overflow-x-auto text-xs"
        >
          <code>{codeLines.join("\n")}</code>
        </pre>
      );
      continue;
    }

    if (line.startsWith("# ")) {
      elements.push(
        <h1 key={elements.length} className="text-xl font-bold mt-6 mb-2">
          {line.slice(2)}
        </h1>
      );
      i++;
      continue;
    }
    if (line.startsWith("## ")) {
      elements.push(
        <h2
          key={elements.length}
          className="text-lg font-semibold mt-5 mb-2"
        >
          {line.slice(3)}
        </h2>
      );
      i++;
      continue;
    }
    if (line.startsWith("### ")) {
      elements.push(
        <h3
          key={elements.length}
          className="text-base font-semibold mt-4 mb-1"
        >
          {line.slice(4)}
        </h3>
      );
      i++;
      continue;
    }

    if (line.match(/^-{3,}$/) || line.match(/^\*{3,}$/)) {
      elements.push(<hr key={elements.length} className="my-4" />);
      i++;
      continue;
    }

    if (line.match(/^[-*] /)) {
      const listItems: string[] = [];
      while (i < lines.length && lines[i].match(/^[-*] /)) {
        listItems.push(lines[i].replace(/^[-*] /, ""));
        i++;
      }
      elements.push(
        <ul key={elements.length} className="list-disc pl-5 space-y-1 my-2">
          {listItems.map((item, j) => (
            <li key={j}>
              <InlineMarkdown text={item} />
            </li>
          ))}
        </ul>
      );
      continue;
    }

    if (line.match(/^\d+\. /)) {
      const listItems: string[] = [];
      while (i < lines.length && lines[i].match(/^\d+\. /)) {
        listItems.push(lines[i].replace(/^\d+\. /, ""));
        i++;
      }
      elements.push(
        <ol
          key={elements.length}
          className="list-decimal pl-5 space-y-1 my-2"
        >
          {listItems.map((item, j) => (
            <li key={j}>
              <InlineMarkdown text={item} />
            </li>
          ))}
        </ol>
      );
      continue;
    }

    if (line.includes("|") && lines[i + 1]?.match(/^\|[-| :]+\|$/)) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].includes("|")) {
        tableLines.push(lines[i]);
        i++;
      }
      const headers = tableLines[0]
        .split("|")
        .filter((c) => c.trim())
        .map((c) => c.trim());
      const rows = tableLines.slice(2).map((row) =>
        row
          .split("|")
          .filter((c) => c.trim())
          .map((c) => c.trim())
      );
      elements.push(
        <div key={elements.length} className="overflow-x-auto my-3">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b">
                {headers.map((h, j) => (
                  <th key={j} className="text-left p-2 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, j) => (
                <tr key={j} className="border-b">
                  {row.map((cell, k) => (
                    <td key={k} className="p-2">
                      <InlineMarkdown text={cell} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    if (line.trim() === "") {
      i++;
      continue;
    }

    elements.push(
      <p key={elements.length} className="my-2">
        <InlineMarkdown text={line} />
      </p>
    );
    i++;
  }

  return <>{elements}</>;
}

function InlineMarkdown({ text }: { text: string }) {
  const parts = text.split(/(\*\*.*?\*\*|`.*?`|_.*?_)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <strong key={i} className="font-semibold">
              {part.slice(2, -2)}
            </strong>
          );
        }
        if (part.startsWith("`") && part.endsWith("`")) {
          return (
            <code
              key={i}
              className="bg-muted px-1 py-0.5 rounded text-xs font-mono"
            >
              {part.slice(1, -1)}
            </code>
          );
        }
        if (part.startsWith("_") && part.endsWith("_")) {
          return <em key={i}>{part.slice(1, -1)}</em>;
        }
        return part;
      })}
    </>
  );
}
