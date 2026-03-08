"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus } from "lucide-react";
import { createEvent } from "./actions";

export function CreateEventDialog({
  projectId,
  workspaceId,
}: {
  projectId: string;
  workspaceId: string;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [trigger, setTrigger] = useState("");
  const [pagePattern, setPagePattern] = useState("");
  const [category, setCategory] = useState("");
  const [implementationNotes, setImplementationNotes] = useState("");

  function resetForm() {
    setName("");
    setDescription("");
    setTrigger("");
    setPagePattern("");
    setCategory("");
    setImplementationNotes("");
  }

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
        await createEvent(projectId, workspaceId, formData);
        setOpen(false);
        resetForm();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button>
            <Plus className="mr-2 size-4" />
            New Event
          </Button>
        }
      />
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create event</DialogTitle>
          <DialogDescription>
            Add a new dataLayer event to this workspace.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ev-create-name">Event Name</Label>
            <Input
              id="ev-create-name"
              placeholder="e.g. purchase"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ev-create-description">Description</Label>
            <Textarea
              id="ev-create-description"
              placeholder="What triggers this event?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ev-create-trigger">Trigger</Label>
              <Input
                id="ev-create-trigger"
                placeholder="e.g. on click, page load"
                value={trigger}
                onChange={(e) => setTrigger(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ev-create-category">Category</Label>
              <Input
                id="ev-create-category"
                placeholder="e.g. ecommerce"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ev-create-pattern">Page Pattern</Label>
            <Input
              id="ev-create-pattern"
              placeholder="e.g. /checkout/*"
              value={pagePattern}
              onChange={(e) => setPagePattern(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ev-create-notes">Implementation Notes</Label>
            <Textarea
              id="ev-create-notes"
              placeholder="Notes for developers..."
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
              {isPending ? "Creating..." : "Create event"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
