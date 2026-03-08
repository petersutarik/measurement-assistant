"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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
import { Upload } from "lucide-react";
import { publishWorkspace } from "./actions";

export function PublishWorkspaceDialog({
  projectId,
  workspaceId,
  workspaceName,
  nextVersion,
}: {
  projectId: string;
  workspaceId: string;
  workspaceName: string;
  nextVersion: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.set("name", name);
        if (description) formData.set("description", description);
        await publishWorkspace(projectId, workspaceId, formData);
        setOpen(false);
        setName("");
        setDescription("");
        // Workspace is deleted after publish — redirect to project page
        router.push(`/projects/${projectId}`);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            <Upload className="mr-2 size-4" />
            Publish
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Publish as v{nextVersion}</DialogTitle>
          <DialogDescription>
            Snapshot &quot;{workspaceName}&quot; as the live spec. New workspaces
            will fork from this version.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pub-name">Name</Label>
            <Input
              id="pub-name"
              placeholder={`e.g. v${nextVersion} — initial release`}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pub-description">Description</Label>
            <Textarea
              id="pub-description"
              placeholder="What changed in this version?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
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
              {isPending ? "Publishing..." : `Publish as v${nextVersion}`}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
