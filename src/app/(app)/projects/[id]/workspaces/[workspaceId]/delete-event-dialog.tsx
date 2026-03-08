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
import { deleteEvent } from "./actions";
import type { Event } from "@/types";

export function DeleteEventDialog({
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

  function handleDelete() {
    startTransition(async () => {
      await deleteEvent(projectId, workspaceId, event.id);
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete event</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete &quot;{event.name}&quot;? This will
            also remove all its parameters. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isPending}
          >
            {isPending ? "Deleting..." : "Delete event"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
