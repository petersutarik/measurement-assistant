"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  MoreHorizontal,
  Eye,
  Pencil,
  Trash2,
  Loader2,
} from "lucide-react";
import { createTemplate, updateTemplate, deleteTemplate } from "./actions";

// ── Create / Edit dialog ────────────────────────────────────────────
function TemplateDialog({
  trigger,
  mode = "create",
  initial,
  onSave,
}: {
  trigger: React.ReactNode;
  mode?: "create" | "edit";
  initial?: { name: string; description: string; document: string };
  onSave: (
    name: string,
    description: string,
    document: string
  ) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [document, setDocument] = useState(initial?.document ?? "");
  const [isPending, startTransition] = useTransition();

  function handleOpen(isOpen: boolean) {
    setOpen(isOpen);
    if (isOpen && initial) {
      setName(initial.name);
      setDescription(initial.description);
      setDocument(initial.document);
    }
  }

  function handleSave() {
    if (!name.trim()) return;
    startTransition(async () => {
      await onSave(name.trim(), description.trim(), document);
      setOpen(false);
      if (mode === "create") {
        setName("");
        setDescription("");
        setDocument("");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger render={<>{trigger}</>} />
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "New Template" : "Edit Template"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Create a reusable measurement plan template."
              : "Update this template."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tpl-name">Name</Label>
            <Input
              id="tpl-name"
              placeholder="e.g., E-commerce, Lead Generation"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tpl-desc">Description</Label>
            <Input
              id="tpl-desc"
              placeholder="Brief description of what this template covers"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tpl-doc">Document (Markdown)</Label>
            <Textarea
              id="tpl-doc"
              placeholder="# Measurement Plan&#10;&#10;## Overview&#10;..."
              value={document}
              onChange={(e) => setDocument(e.target.value)}
              rows={16}
              className="font-mono text-xs"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!name.trim() || isPending}>
            {isPending ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : null}
            {mode === "create" ? "Create" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Exported component ──────────────────────────────────────────────
export function TemplateActions(
  props:
    | { type: "create" }
    | {
        type: "row";
        templateId: string;
        templateName: string;
        templateDescription: string;
        templateDocument: string;
        isSystem: boolean;
      }
) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [viewOpen, setViewOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  if (props.type === "create") {
    return (
      <TemplateDialog
        trigger={
          <Button>
            <Plus className="mr-2 size-4" />
            New Template
          </Button>
        }
        onSave={async (name, description, document) => {
          await createTemplate(name, description, document);
          router.refresh();
        }}
      />
    );
  }

  const {
    templateId,
    templateName,
    templateDescription,
    templateDocument,
    isSystem,
  } = props;

  return (
    <>
      {/* View dialog — rendered outside dropdown */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{templateName}</DialogTitle>
            {templateDescription && (
              <DialogDescription>{templateDescription}</DialogDescription>
            )}
          </DialogHeader>
          <div className="rounded-md border bg-muted/30 p-4">
            <pre className="whitespace-pre-wrap text-sm font-mono">
              {templateDocument || "(empty template)"}
            </pre>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit dialog — rendered outside dropdown */}
      {!isSystem && (
        <Dialog
          open={editOpen}
          onOpenChange={setEditOpen}
        >
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <EditForm
              initial={{
                name: templateName,
                description: templateDescription,
                document: templateDocument,
              }}
              onSave={async (name, description, document) => {
                await updateTemplate(templateId, {
                  name,
                  description,
                  document,
                });
                setEditOpen(false);
                router.refresh();
              }}
              onCancel={() => setEditOpen(false)}
            />
          </DialogContent>
        </Dialog>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="icon" className="size-8">
              <MoreHorizontal className="size-4" />
            </Button>
          }
        />
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setViewOpen(true)}>
            <Eye className="mr-2 size-4" />
            View
          </DropdownMenuItem>
          {!isSystem && (
            <>
              <DropdownMenuItem onClick={() => setEditOpen(true)}>
                <Pencil className="mr-2 size-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive"
                disabled={isPending}
                onClick={() => {
                  startTransition(async () => {
                    await deleteTemplate(templateId);
                    router.refresh();
                  });
                }}
              >
                <Trash2 className="mr-2 size-4" />
                Delete
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}

// ── Inline edit form (used inside Dialog) ───────────────────────────
function EditForm({
  initial,
  onSave,
  onCancel,
}: {
  initial: { name: string; description: string; document: string };
  onSave: (
    name: string,
    description: string,
    document: string
  ) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial.name);
  const [description, setDescription] = useState(initial.description);
  const [document, setDocument] = useState(initial.document);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    if (!name.trim()) return;
    startTransition(async () => {
      await onSave(name.trim(), description.trim(), document);
    });
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Edit Template</DialogTitle>
        <DialogDescription>Update this template.</DialogDescription>
      </DialogHeader>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="edit-name">Name</Label>
          <Input
            id="edit-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-desc">Description</Label>
          <Input
            id="edit-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-doc">Document (Markdown)</Label>
          <Textarea
            id="edit-doc"
            value={document}
            onChange={(e) => setDocument(e.target.value)}
            rows={16}
            className="font-mono text-xs"
          />
        </div>
      </div>
      <DialogFooter>
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={!name.trim() || isPending}>
          {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
          Save
        </Button>
      </DialogFooter>
    </>
  );
}
