"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TableCell, TableRow } from "@/components/ui/table";
import {
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Loader2,
  ChevronRight,
} from "lucide-react";
import {
  createDestinationEvent,
  updateDestinationEvent,
  deleteDestinationEvent,
  createDestinationParameter,
  updateDestinationParameter,
  deleteDestinationParameter,
} from "./actions";
import type { DestinationEvent, DestinationParameter } from "@/types";

type EventWithParams = DestinationEvent & { parameters: DestinationParameter[] };

// ── Create Event button ─────────────────────────────────────────────
function CreateEventDialog({ destinationId }: { destinationId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [docsUrl, setDocsUrl] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    if (!name.trim()) return;
    startTransition(async () => {
      await createDestinationEvent(destinationId, {
        name: name.trim(),
        description: description.trim() || undefined,
        docsUrl: docsUrl.trim() || undefined,
      });
      setOpen(false);
      setName("");
      setDescription("");
      setDocsUrl("");
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm">
            <Plus className="mr-2 size-4" />
            Add Event
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Event</DialogTitle>
          <DialogDescription>
            Add an event to this destination.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="event-name">Event Name</Label>
            <Input
              id="event-name"
              placeholder="e.g., purchase, page_view"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="event-desc">Description</Label>
            <Input
              id="event-desc"
              placeholder="What this event tracks"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="event-docs">Documentation URL</Label>
            <Input
              id="event-docs"
              placeholder="https://..."
              value={docsUrl}
              onChange={(e) => setDocsUrl(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!name.trim() || isPending}>
            {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Create Parameter dialog ─────────────────────────────────────────
function CreateParameterDialog({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState("string");
  const [description, setDescription] = useState("");
  const [exampleValue, setExampleValue] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    if (!name.trim()) return;
    startTransition(async () => {
      await createDestinationParameter(eventId, {
        name: name.trim(),
        type,
        description: description.trim() || undefined,
        exampleValue: exampleValue.trim() || undefined,
      });
      setOpen(false);
      setName("");
      setType("string");
      setDescription("");
      setExampleValue("");
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            <Plus className="mr-1 size-3" />
            Add Parameter
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Parameter</DialogTitle>
          <DialogDescription>Add a parameter to this event.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="param-name">Name</Label>
            <Input
              id="param-name"
              placeholder="e.g., transaction_id, value"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="param-type">Type</Label>
            <Select value={type} onValueChange={(v) => v && setType(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="string">string</SelectItem>
                <SelectItem value="number">number</SelectItem>
                <SelectItem value="boolean">boolean</SelectItem>
                <SelectItem value="array">array</SelectItem>
                <SelectItem value="object">object</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="param-desc">Description</Label>
            <Input
              id="param-desc"
              placeholder="What this parameter represents"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="param-example">Example Value</Label>
            <Input
              id="param-example"
              placeholder="e.g., T12345, 99.99"
              value={exampleValue}
              onChange={(e) => setExampleValue(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!name.trim() || isPending}>
            {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Event row with collapsible parameters ───────────────────────────
function EventRow({
  event,
  isEditable,
  destinationId,
}: {
  event: EventWithParams;
  isEditable: boolean;
  destinationId: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <TableRow
        className="cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        <TableCell className="font-medium">
          <div className="flex items-center gap-1">
            <ChevronRight
              className={`size-4 text-muted-foreground transition-transform ${isOpen ? "rotate-90" : ""}`}
            />
            {event.name}
          </div>
        </TableCell>
        <TableCell className="text-muted-foreground text-sm">
          {event.description || "—"}
        </TableCell>
        <TableCell className="text-sm">
          {event.parameters.length}
        </TableCell>
        <TableCell className="text-right">
          {event.isStandard ? (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              Standard
            </Badge>
          ) : (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              Custom
            </Badge>
          )}
        </TableCell>
        {isEditable && (
          <TableCell onClick={(e) => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="ghost" size="icon" className="size-7">
                    <MoreHorizontal className="size-4" />
                  </Button>
                }
              />
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  className="text-destructive"
                  disabled={isPending}
                  onClick={() => {
                    startTransition(async () => {
                      await deleteDestinationEvent(event.id);
                      router.refresh();
                    });
                  }}
                >
                  <Trash2 className="mr-2 size-4" />
                  Delete Event
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </TableCell>
        )}
      </TableRow>
      {isOpen && (
        <TableRow className="hover:bg-transparent">
          <TableCell colSpan={isEditable ? 5 : 4} className="p-0">
            <div className="bg-muted/30 border-t px-6 py-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium">Parameters</h4>
                {isEditable && (
                  <CreateParameterDialog eventId={event.id} />
                )}
              </div>
              {event.parameters.length > 0 ? (
                <div className="space-y-2">
                  {event.parameters.map((param) => (
                    <ParameterRow
                      key={param.id}
                      param={param}
                      isEditable={isEditable}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No parameters defined.
                </p>
              )}
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

// ── Parameter row ───────────────────────────────────────────────────
function ParameterRow({
  param,
  isEditable,
}: {
  param: DestinationParameter;
  isEditable: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex items-center justify-between rounded-md border bg-background px-3 py-2 text-sm">
      <div className="flex items-center gap-3">
        <code className="font-mono text-xs">{param.name}</code>
        <Badge variant="outline" className="text-[10px] px-1 py-0">
          {param.type}
        </Badge>
        {param.isRequired && (
          <Badge variant="secondary" className="text-[10px] px-1 py-0">
            Required
          </Badge>
        )}
        {param.description && (
          <span className="text-muted-foreground">{param.description}</span>
        )}
      </div>
      {isEditable && (
        <Button
          variant="ghost"
          size="icon"
          className="size-6"
          disabled={isPending}
          onClick={() => {
            startTransition(async () => {
              await deleteDestinationParameter(param.id);
              router.refresh();
            });
          }}
        >
          <Trash2 className="size-3" />
        </Button>
      )}
    </div>
  );
}

// ── Exported component ──────────────────────────────────────────────
export function DestinationDetailActions(
  props:
    | { type: "createEvent"; destinationId: string }
    | {
        type: "eventRow";
        event: EventWithParams;
        isEditable: boolean;
        destinationId: string;
      }
) {
  if (props.type === "createEvent") {
    return <CreateEventDialog destinationId={props.destinationId} />;
  }

  return (
    <EventRow
      event={props.event}
      isEditable={props.isEditable}
      destinationId={props.destinationId}
    />
  );
}
