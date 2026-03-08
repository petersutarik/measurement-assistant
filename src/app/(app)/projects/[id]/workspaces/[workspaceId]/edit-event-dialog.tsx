"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateEvent } from "./actions";
import type { Event } from "@/types";

export function EditEventDialog({
  projectId,
  workspaceId,
  event,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: {
  projectId: string;
  workspaceId: string;
  event: Event;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = controlledOnOpenChange ?? setInternalOpen;
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState(event.name);
  const [description, setDescription] = useState(event.description ?? "");
  const [trigger, setTrigger] = useState(event.trigger ?? "");
  const [pagePattern, setPagePattern] = useState(event.pagePattern ?? "");
  const [category, setCategory] = useState(event.category ?? "");
  const [implementationNotes, setImplementationNotes] = useState(
    event.implementationNotes ?? ""
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.set("name", name);
        if (description) formData.set("description", description);
        if (trigger) formData.set("trigger", trigger);
        if (pagePattern) formData.set("pagePattern", pagePattern);
        if (category) formData.set("category", category);
        if (implementationNotes)
          formData.set("implementationNotes", implementationNotes);
        await updateEvent(projectId, workspaceId, event.id, formData);
        setOpen(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit event</DialogTitle>
          <DialogDescription>Update event details.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ev-edit-name">Event Name</Label>
            <Input
              id="ev-edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ev-edit-description">Description</Label>
            <Textarea
              id="ev-edit-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ev-edit-trigger">Trigger</Label>
              <Input
                id="ev-edit-trigger"
                value={trigger}
                onChange={(e) => setTrigger(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ev-edit-category">Category</Label>
              <Input
                id="ev-edit-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ev-edit-pattern">Page Pattern</Label>
            <Input
              id="ev-edit-pattern"
              value={pagePattern}
              onChange={(e) => setPagePattern(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ev-edit-notes">Implementation Notes</Label>
            <Textarea
              id="ev-edit-notes"
              value={implementationNotes}
              onChange={(e) => setImplementationNotes(e.target.value)}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || isPending}>
              {isPending ? "Saving..." : "Save changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
