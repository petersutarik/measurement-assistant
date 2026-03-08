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
import { deleteWorkspace } from "./actions";
import type { SpecVersion } from "@/types";

export function DeleteWorkspaceDialog({
  projectId,
  workspace,
}: {
  projectId: string;
  workspace: SpecVersion;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      await deleteWorkspace(projectId, workspace.id);
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="ghost" size="icon">
            <Trash2 className="size-4 text-destructive" />
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete workspace</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete &quot;{workspace.name}&quot;? This
            will remove all events and parameters in this workspace. This action
            cannot be undone.
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
            {isPending ? "Deleting..." : "Delete workspace"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
