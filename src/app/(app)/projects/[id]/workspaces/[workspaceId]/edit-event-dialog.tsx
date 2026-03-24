"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
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
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { CustomFieldCell } from "@/components/custom-field-cell";
import { updateEvent, upsertCustomFieldValue } from "./actions";
import { unlinkParameter } from "./events/[eventId]/actions";
import { AddParameterInput } from "./add-parameter-input";
import type { Event, CustomFieldDefinition } from "@/types";

interface EventParam {
  id: string;
  eventId: string;
  name: string;
  type: string;
  isRequired: boolean;
  exampleValue: string | null;
  description: string | null;
  origin: string | null;
}

interface WorkspaceParam {
  id: string;
  name: string;
  type: string;
  description: string | null;
  isRequired: boolean;
  exampleValue: string | null;
  origin: string | null;
}

export function EditEventDialog({
  projectId,
  workspaceId,
  event,
  eventParams = [],
  workspaceParams = [],
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  customFieldDefinitions: cfDefs = [],
  customFieldValues: cfValueMap,
}: {
  projectId: string;
  workspaceId: string;
  event: Event;
  eventParams?: EventParam[];
  workspaceParams?: WorkspaceParam[];
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  customFieldDefinitions?: CustomFieldDefinition[];
  customFieldValues?: Map<string, unknown>;
}) {
  const router = useRouter();
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

  const linkedParamIds = useMemo(
    () => new Set(eventParams.map((p) => p.id)),
    [eventParams]
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

  function handleRemoveParam(paramId: string) {
    startTransition(async () => {
      await unlinkParameter(projectId, workspaceId, event.id, paramId);
      router.refresh();
    });
  }

  function handleParamAdded() {
    router.refresh();
  }

  // Build code example
  const codeExample = buildCodeExample(name, eventParams);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[85vh] overflow-y-auto max-w-2xl">
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

          {/* Parameters section */}
          <div className="space-y-3 border-t pt-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Parameters
            </p>
            {eventParams.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {eventParams.map((p) => (
                  <Badge
                    key={p.id}
                    variant="secondary"
                    className="gap-1 pr-1 font-mono text-xs"
                  >
                    {p.name}
                    <span className="text-muted-foreground font-sans">
                      ({p.type})
                    </span>
                    <button
                      type="button"
                      className="ml-0.5 rounded-full p-0.5 hover:bg-muted-foreground/20"
                      onClick={() => handleRemoveParam(p.id)}
                      disabled={isPending}
                    >
                      <X className="size-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            <AddParameterInput
              projectId={projectId}
              workspaceId={workspaceId}
              eventId={event.id}
              existingParams={workspaceParams}
              linkedParamIds={linkedParamIds}
              onAdded={handleParamAdded}
            />
          </div>

          {/* Code example (read-only preview) */}
          <div className="space-y-2 border-t pt-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              dataLayer.push preview
            </p>
            <pre className="text-xs font-mono bg-muted rounded-md px-3 py-2 whitespace-pre overflow-x-auto">
              {codeExample}
            </pre>
          </div>

          {cfDefs.filter((d) => d.entityType === "event").length > 0 && (
            <div className="space-y-3 border-t pt-4">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Custom fields
              </p>
              {cfDefs
                .filter((d) => d.entityType === "event")
                .map((def) => (
                  <div key={def.id} className="space-y-1">
                    <Label className="text-sm">{def.name}</Label>
                    <CustomFieldCell
                      definition={def}
                      value={cfValueMap?.get(def.id) ?? null}
                      onSave={async (_definitionId, value) => {
                        await upsertCustomFieldValue(
                          projectId,
                          workspaceId,
                          def.id,
                          event.id,
                          "event",
                          value
                        );
                      }}
                    />
                  </div>
                ))}
            </div>
          )}

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

function buildCodeExample(eventName: string, params: { name: string; type: string; exampleValue: string | null }[]): string {
  if (params.length === 0) {
    return `dataLayer.push({ event: '${eventName}' });`;
  }

  const paramEntries = params
    .map((p) => {
      const val = p.exampleValue ?? exampleForType(p.type);
      return `  ${p.name}: ${val}`;
    })
    .join(",\n");

  return `dataLayer.push({\n  event: '${eventName}',\n${paramEntries}\n});`;
}

function exampleForType(type: string): string {
  switch (type) {
    case "string":
      return "'...'";
    case "number":
    case "integer":
      return "0";
    case "boolean":
      return "true";
    case "array":
      return "[]";
    case "object":
      return "{}";
    default:
      return "'...'";
  }
}
