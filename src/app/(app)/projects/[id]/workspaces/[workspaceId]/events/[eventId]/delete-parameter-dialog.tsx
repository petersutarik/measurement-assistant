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
import { Trash2 } from "lucide-react";
import { deleteParameter } from "./actions";
import type { Parameter } from "@/types";

export function DeleteParameterDialog({
  projectId,
  workspaceId,
  eventId,
  parameter,
  hasChildren,
}: {
  projectId: string;
  workspaceId: string;
  eventId: string;
  parameter: Parameter;
  hasChildren: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      await deleteParameter(projectId, workspaceId, eventId, parameter.id);
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="ghost" size="icon" className="size-7">
            <Trash2 className="size-3 text-destructive" />
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete parameter</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete &quot;{parameter.name}&quot;?
            {hasChildren &&
              " This will also delete all child parameters."}
            {" "}This action cannot be undone.
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
            {isPending ? "Deleting..." : "Delete parameter"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
