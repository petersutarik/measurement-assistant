"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  FileText,
  Globe,
  StickyNote,
  Upload,
  X,
  Loader2,
  ArrowRight,
  ArrowLeft,
  ShoppingCart,
  Target,
  LayoutDashboard,
  Check,
} from "lucide-react";
import {
  createPlan,
  addContextNote,
  addContextUrl,
  getTemplates,
} from "../actions";
import type { PlanTemplate } from "@/types";

type ContextItem = {
  id: string;
  type: "note" | "url" | "file";
  name: string;
  content: string;
  url?: string;
};

const TEMPLATE_ICONS: Record<string, React.ReactNode> = {
  "E-commerce": <ShoppingCart className="size-5" />,
  "Lead Generation": <Target className="size-5" />,
  "SaaS / Web Application": <LayoutDashboard className="size-5" />,
};

export default function NewPlanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [step, setStep] = useState<1 | 2>(1);
  const [title, setTitle] = useState("");
  const [selectedTemplate, setSelectedTemplate] =
    useState<PlanTemplate | null>(null);
  const [templates, setTemplates] = useState<PlanTemplate[]>([]);
  const [contextItems, setContextItems] = useState<ContextItem[]>([]);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  // Note form
  const [noteName, setNoteName] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [showNoteForm, setShowNoteForm] = useState(false);

  // URL form
  const [urlInput, setUrlInput] = useState("");
  const [showUrlForm, setShowUrlForm] = useState(false);

  // File upload
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;
    for (const file of Array.from(files)) {
      const reader = new FileReader();
      reader.onload = () => {
        const content = reader.result as string;
        const item: ContextItem = {
          id: crypto.randomUUID(),
          type: "file",
          name: file.name,
          content: content.slice(0, 50000),
        };
        setContextItems((prev) => [...prev, item]);
      };
      reader.readAsText(file);
    }
    // Reset so the same file can be selected again
    e.target.value = "";
  }

  useEffect(() => {
    getTemplates().then(setTemplates);
  }, []);

  function addNote() {
    if (!noteContent.trim()) return;
    const item: ContextItem = {
      id: crypto.randomUUID(),
      type: "note",
      name: noteName.trim() || "Note",
      content: noteContent.trim(),
    };
    setContextItems((prev) => [...prev, item]);
    setNoteName("");
    setNoteContent("");
    setShowNoteForm(false);
  }

  function addUrl() {
    if (!urlInput.trim()) return;
    const url = urlInput.trim();
    const item: ContextItem = {
      id: crypto.randomUUID(),
      type: "url",
      name: url,
      url,
      content: "",
    };
    setContextItems((prev) => [...prev, item]);
    setUrlInput("");
    setShowUrlForm(false);
  }

  function removeItem(id: string) {
    setContextItems((prev) => prev.filter((i) => i.id !== id));
  }

  async function handleCreate() {
    const { id } = await params;
    startTransition(async () => {
      const plan = await createPlan(
        id,
        title || selectedTemplate?.name || "Untitled Plan",
        selectedTemplate?.document
      );

      // Save context sources (URLs will be fetched server-side, files saved as notes)
      for (const item of contextItems) {
        if (item.type === "note" || item.type === "file") {
          await addContextNote(id, plan.id, item.name, item.content);
        } else if (item.type === "url" && item.url) {
          await addContextUrl(id, plan.id, item.url);
        }
      }

      router.push(`/projects/${id}/plans/${plan.id}`);
    });
  }

  return (
    <div className="mx-auto max-w-2xl py-8 space-y-6">
      {/* Step indicator */}
      <div className="flex items-center gap-3">
        <div
          className={`flex size-7 items-center justify-center rounded-full text-xs font-medium ${
            step === 1
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground"
          }`}
        >
          1
        </div>
        <div className="h-px flex-1 bg-border" />
        <div
          className={`flex size-7 items-center justify-center rounded-full text-xs font-medium ${
            step === 2
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground"
          }`}
        >
          2
        </div>
      </div>

      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>New Measurement Plan</CardTitle>
            <CardDescription>
              Start from a template or blank. You can customize everything later.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Template selection */}
            {templates.length > 0 && (
              <div className="space-y-3">
                <Label>Template</Label>
                <div className="grid gap-3">
                  {templates.map((template) => (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => {
                        if (selectedTemplate?.id === template.id) {
                          setSelectedTemplate(null);
                        } else {
                          setSelectedTemplate(template);
                          if (!title) setTitle(template.name);
                        }
                      }}
                      className={`flex items-start gap-3 rounded-lg border p-4 text-left transition-colors hover:bg-accent/50 ${
                        selectedTemplate?.id === template.id
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : "border-border"
                      }`}
                    >
                      <div
                        className={`mt-0.5 shrink-0 ${selectedTemplate?.id === template.id ? "text-primary" : "text-muted-foreground"}`}
                      >
                        {TEMPLATE_ICONS[template.name] || (
                          <FileText className="size-5" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">
                            {template.name}
                          </span>
                          {!template.accountId && (
                            <Badge
                              variant="secondary"
                              className="text-[10px] px-1.5 py-0"
                            >
                              Built-in
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {template.description}
                        </p>
                      </div>
                      {selectedTemplate?.id === template.id && (
                        <Check className="size-4 text-primary shrink-0 mt-0.5" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="title">Plan title</Label>
              <Input
                id="title"
                placeholder="e.g., E-commerce tracking plan"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                autoFocus
              />
            </div>
            <div className="flex justify-end">
              <Button onClick={() => setStep(2)}>
                Next: Add Context
                <ArrowRight className="ml-2 size-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Add Context</CardTitle>
              <CardDescription>
                The more context you provide, the better the AI can plan your
                measurement. Add meeting notes, call transcripts, website URLs,
                or any relevant documents.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Context items list */}
              {contextItems.length > 0 && (
                <div className="space-y-2">
                  {contextItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-2 rounded-md border p-3"
                    >
                      {item.type === "note" ? (
                        <StickyNote className="size-4 text-amber-500 shrink-0" />
                      ) : item.type === "file" ? (
                        <Upload className="size-4 text-green-500 shrink-0" />
                      ) : (
                        <Globe className="size-4 text-blue-500 shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">
                          {item.name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {item.type === "url"
                            ? item.url
                            : `${item.content.slice(0, 100)}${item.content.length > 100 ? "..." : ""}`}
                        </p>
                      </div>
                      <Badge variant="secondary" className="text-xs shrink-0">
                        {item.type}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 shrink-0"
                        onClick={() => removeItem(item.id)}
                      >
                        <X className="size-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Note form */}
              {showNoteForm && (
                <div className="space-y-3 rounded-md border p-3 bg-muted/50">
                  <div className="flex items-center gap-2">
                    <StickyNote className="size-4 text-amber-500" />
                    <span className="text-sm font-medium">Add Note</span>
                  </div>
                  <Input
                    placeholder="Label (e.g., Call transcript, Meeting notes)"
                    value={noteName}
                    onChange={(e) => setNoteName(e.target.value)}
                    autoFocus
                  />
                  <Textarea
                    placeholder="Paste your notes, transcript, or other text..."
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    rows={6}
                  />
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setShowNoteForm(false);
                        setNoteName("");
                        setNoteContent("");
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={addNote}
                      disabled={!noteContent.trim()}
                    >
                      Add
                    </Button>
                  </div>
                </div>
              )}

              {/* URL form */}
              {showUrlForm && (
                <div className="space-y-3 rounded-md border p-3 bg-muted/50">
                  <div className="flex items-center gap-2">
                    <Globe className="size-4 text-blue-500" />
                    <span className="text-sm font-medium">Add URL</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    We&apos;ll fetch the page content to give the AI context
                    about your site structure.
                  </p>
                  <div className="flex gap-2">
                    <Input
                      placeholder="https://example.com"
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") addUrl();
                      }}
                    />
                    <Button
                      size="sm"
                      onClick={addUrl}
                      disabled={!urlInput.trim()}
                    >
                      Add
                    </Button>
                  </div>
                  <div className="flex justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setShowUrlForm(false);
                        setUrlInput("");
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {/* Add buttons */}
              {!showNoteForm && !showUrlForm && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowNoteForm(true)}
                  >
                    <StickyNote className="mr-2 size-4" />
                    Add Note
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowUrlForm(true)}
                  >
                    <Globe className="mr-2 size-4" />
                    Add URL
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="mr-2 size-4" />
                    Upload File
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept=".txt,.md,.csv,.json,.xml,.html,.pdf,.doc,.docx"
                    multiple
                    onChange={handleFileUpload}
                  />
                </div>
              )}

              {/* Empty state prompt */}
              {contextItems.length === 0 && !showNoteForm && !showUrlForm && (
                <div className="rounded-md border border-dashed p-6 text-center">
                  <FileText className="mx-auto size-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    No context added yet. Consider adding:
                  </p>
                  <ul className="text-xs text-muted-foreground mt-2 space-y-1">
                    <li>
                      <strong>Meeting notes</strong> or call transcripts
                      discussing measurement goals
                    </li>
                    <li>
                      <strong>Website URLs</strong> so the AI can understand your
                      site structure
                    </li>
                    <li>
                      <strong>Existing documentation</strong> about your tracking
                      setup
                    </li>
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <Button variant="ghost" onClick={() => setStep(1)}>
              <ArrowLeft className="mr-2 size-4" />
              Back
            </Button>
            <div className="flex gap-2">
              {contextItems.length === 0 && (
                <Button
                  variant="outline"
                  onClick={handleCreate}
                  disabled={isPending}
                >
                  Skip & Start
                </Button>
              )}
              <Button onClick={handleCreate} disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    Start Planning
                  </>
                )}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
