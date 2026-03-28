"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Plus, MoreHorizontal, Trash2, Loader2, BarChart3 } from "lucide-react";
import {
  addDestinationToProject,
  removeDestinationFromProject,
} from "./actions";

type AvailableDestination = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  docsUrl: string | null;
  iconUrl: string | null;
};

export function DestinationActions(
  props:
    | {
        type: "add";
        projectId: string;
        availableDestinations: AvailableDestination[];
      }
    | {
        type: "remove";
        projectId: string;
        projectDestinationId: string;
        destinationName: string;
      },
) {
  if (props.type === "add") {
    return (
      <AddDestinationDialog
        projectId={props.projectId}
        availableDestinations={props.availableDestinations}
      />
    );
  }

  return (
    <RemoveDestinationButton
      projectId={props.projectId}
      projectDestinationId={props.projectDestinationId}
      destinationName={props.destinationName}
    />
  );
}

function AddDestinationDialog({
  projectId,
  availableDestinations,
}: {
  projectId: string;
  availableDestinations: AvailableDestination[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  function handleSelect(dest: AvailableDestination) {
    setSelectedId(dest.id);
    startTransition(async () => {
      await addDestinationToProject(projectId, dest.id);
      setOpen(false);
      setSelectedId(null);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button>
            <Plus className="mr-2 size-4" />
            Add Destination
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Destination</DialogTitle>
          <DialogDescription>
            Choose a measurement platform to add to this project.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          {availableDestinations.length > 0 ? (
            availableDestinations.map((dest) => (
              <button
                key={dest.id}
                disabled={isPending}
                onClick={() => handleSelect(dest)}
                className="flex items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-accent hover:border-accent-foreground/20 cursor-pointer"
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted">
                  <BarChart3 className="size-5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-sm">{dest.name}</span>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {dest.description || "No description"}
                  </p>
                </div>
                {isPending && selectedId === dest.id && (
                  <Loader2 className="size-4 animate-spin text-muted-foreground shrink-0" />
                )}
              </button>
            ))
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              All available destinations have been added to this project.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function RemoveDestinationButton({
  projectId,
  projectDestinationId,
  destinationName,
}: {
  projectId: string;
  projectDestinationId: string;
  destinationName: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={(e) => e.preventDefault()}
          >
            <MoreHorizontal className="size-4" />
          </Button>
        }
      />
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          className="text-destructive"
          disabled={isPending}
          onClick={(e) => {
            e.preventDefault();
            startTransition(async () => {
              await removeDestinationFromProject(
                projectId,
                projectDestinationId,
              );
              router.refresh();
            });
          }}
        >
          <Trash2 className="mr-2 size-4" />
          Remove from Project
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
