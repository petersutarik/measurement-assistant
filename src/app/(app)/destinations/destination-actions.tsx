"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  ExternalLink,
} from "lucide-react";
import {
  createDestination,
  updateDestination,
  deleteDestination,
} from "./actions";

// ── Create / Edit dialog ────────────────────────────────────────────
function DestinationDialog({
  trigger,
  mode = "create",
  initial,
  onSave,
}: {
  trigger: React.ReactElement;
  mode?: "create" | "edit";
  initial?: {
    name: string;
    description: string;
    docsUrl: string;
    iconUrl: string;
  };
  onSave: (
    name: string,
    description: string,
    docsUrl: string,
    iconUrl: string
  ) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [docsUrl, setDocsUrl] = useState(initial?.docsUrl ?? "");
  const [iconUrl, setIconUrl] = useState(initial?.iconUrl ?? "");
  const [isPending, startTransition] = useTransition();

  function handleOpen(isOpen: boolean) {
    setOpen(isOpen);
    if (isOpen && initial) {
      setName(initial.name);
      setDescription(initial.description);
      setDocsUrl(initial.docsUrl);
      setIconUrl(initial.iconUrl);
    }
  }

  function handleSave() {
    if (!name.trim()) return;
    startTransition(async () => {
      await onSave(name.trim(), description.trim(), docsUrl.trim(), iconUrl.trim());
      setOpen(false);
      if (mode === "create") {
        setName("");
        setDescription("");
        setDocsUrl("");
        setIconUrl("");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "New Destination" : "Edit Destination"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Add a new destination platform."
              : "Update this destination."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="dest-name">Name</Label>
            <Input
              id="dest-name"
              placeholder="e.g., Google Analytics 4, Meta Pixel"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dest-desc">Description</Label>
            <Input
              id="dest-desc"
              placeholder="Brief description of this destination"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dest-docs">Documentation URL</Label>
            <Input
              id="dest-docs"
              placeholder="https://developers.google.com/analytics/..."
              value={docsUrl}
              onChange={(e) => setDocsUrl(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dest-icon">Icon URL</Label>
            <Input
              id="dest-icon"
              placeholder="https://example.com/icon.svg"
              value={iconUrl}
              onChange={(e) => setIconUrl(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!name.trim() || isPending}>
            {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
            {mode === "create" ? "Create" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Exported component ──────────────────────────────────────────────
export function DestinationActions(
  props:
    | { type: "create" }
    | {
        type: "row";
        destinationId: string;
        destinationName: string;
        destinationDescription: string | null;
        destinationDocsUrl: string | null;
        destinationIconUrl: string | null;
        isSystem: boolean;
      }
) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [viewOpen, setViewOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  if (props.type === "create") {
    return (
      <DestinationDialog
        trigger={
          <Button>
            <Plus className="mr-2 size-4" />
            New Destination
          </Button>
        }
        onSave={async (name, description, docsUrl, iconUrl) => {
          await createDestination({ name, description, docsUrl, iconUrl });
          router.refresh();
        }}
      />
    );
  }

  const {
    destinationId,
    destinationName,
    destinationDescription,
    destinationDocsUrl,
    destinationIconUrl,
    isSystem,
  } = props;

  return (
    <>
      {/* View dialog */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{destinationName}</DialogTitle>
            {destinationDescription && (
              <DialogDescription>{destinationDescription}</DialogDescription>
            )}
          </DialogHeader>
          <div className="space-y-3 text-sm">
            {destinationDocsUrl && (
              <div>
                <span className="text-muted-foreground">Docs: </span>
                <a
                  href={destinationDocsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline underline-offset-4"
                >
                  {destinationDocsUrl}
                  <ExternalLink className="ml-1 inline size-3" />
                </a>
              </div>
            )}
            {destinationIconUrl && (
              <div>
                <span className="text-muted-foreground">Icon: </span>
                <span className="break-all">{destinationIconUrl}</span>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      {!isSystem && (
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent>
            <EditForm
              initial={{
                name: destinationName,
                description: destinationDescription ?? "",
                docsUrl: destinationDocsUrl ?? "",
                iconUrl: destinationIconUrl ?? "",
              }}
              onSave={async (name, description, docsUrl, iconUrl) => {
                await updateDestination(destinationId, {
                  name,
                  description,
                  docsUrl,
                  iconUrl,
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
          <DropdownMenuItem>
            <Link
              href={`/destinations/${destinationId}`}
              className="flex items-center"
            >
              <Eye className="mr-2 size-4" />
              View Details
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setViewOpen(true)}>
            <Eye className="mr-2 size-4" />
            Quick View
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
                    await deleteDestination(destinationId);
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

// ── Inline edit form ────────────────────────────────────────────────
function EditForm({
  initial,
  onSave,
  onCancel,
}: {
  initial: { name: string; description: string; docsUrl: string; iconUrl: string };
  onSave: (
    name: string,
    description: string,
    docsUrl: string,
    iconUrl: string
  ) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial.name);
  const [description, setDescription] = useState(initial.description);
  const [docsUrl, setDocsUrl] = useState(initial.docsUrl);
  const [iconUrl, setIconUrl] = useState(initial.iconUrl);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    if (!name.trim()) return;
    startTransition(async () => {
      await onSave(name.trim(), description.trim(), docsUrl.trim(), iconUrl.trim());
    });
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Edit Destination</DialogTitle>
        <DialogDescription>Update this destination.</DialogDescription>
      </DialogHeader>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="edit-dest-name">Name</Label>
          <Input
            id="edit-dest-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-dest-desc">Description</Label>
          <Input
            id="edit-dest-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-dest-docs">Documentation URL</Label>
          <Input
            id="edit-dest-docs"
            value={docsUrl}
            onChange={(e) => setDocsUrl(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-dest-icon">Icon URL</Label>
          <Input
            id="edit-dest-icon"
            value={iconUrl}
            onChange={(e) => setIconUrl(e.target.value)}
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
