"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Pencil,
  Trash2,
  Loader2,
  Sparkles,
  ArrowRight,
  ChevronDown,
} from "lucide-react";
import {
  addEventMapping,
  updateEventMapping,
  removeEventMapping,
  addParameterMapping,
  removeParameterMapping,
  generateMappingsFromPlan,
} from "./actions";

type SpecEvent = { id: string; name: string; description: string | null };
type SpecParam = { id: string; name: string; type: string };
type DestParam = {
  id: string;
  name: string;
  type: string;
  isRequired: boolean;
  scope: string | null;
};
type CatalogEvent = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
};
type Mapping = {
  id: string;
  sourceEvent: { id: string; name: string; description: string | null };
  destEvent: {
    id: string;
    name: string;
    description: string | null;
    category: string | null;
  };
  parameterMappings: {
    id: string;
    sourceParam: { id: string; name: string } | null;
    destParam: {
      id: string;
      name: string;
      type: string;
      isRequired: boolean;
      scope: string | null;
    };
    mappingType: string;
    staticValue: string | null;
  }[];
};

// ── Generate from Plan button ───────────────────────────────────

export function GenerateFromPlanButton({
  projectId,
  projectDestinationId,
  hasSpecEvents,
}: {
  projectId: string;
  projectDestinationId: string;
  hasSpecEvents: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{
    mappedCount: number;
    totalSpecEvents: number;
  } | null>(null);

  if (!hasSpecEvents) return null;

  return (
    <>
      <Button
        variant="outline"
        disabled={isPending}
        onClick={() => {
          startTransition(async () => {
            const res = await generateMappingsFromPlan(
              projectId,
              projectDestinationId,
            );
            setResult(res);
            router.refresh();
          });
        }}
      >
        {isPending ? (
          <Loader2 className="mr-2 size-4 animate-spin" />
        ) : (
          <Sparkles className="mr-2 size-4" />
        )}
        {isPending ? "Generating..." : "Generate from Plan"}
      </Button>
      {result && !isPending && (
        <span className="text-xs text-muted-foreground">
          Mapped {result.mappedCount}/{result.totalSpecEvents} events
        </span>
      )}
    </>
  );
}

// ── Add mapping dialog ──────────────────────────────────────────

export function AddMappingButton({
  projectId,
  projectDestinationId,
  specEvents,
  catalogEvents,
}: {
  projectId: string;
  projectDestinationId: string;
  specEvents: SpecEvent[];
  catalogEvents: CatalogEvent[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [selectedSpecEvent, setSelectedSpecEvent] = useState("");
  const [selectedCatalogEvent, setSelectedCatalogEvent] = useState("");
  const [catalogSearch, setCatalogSearch] = useState("");

  const filteredCatalog = catalogSearch
    ? catalogEvents.filter((e) =>
        e.name.toLowerCase().includes(catalogSearch.toLowerCase()),
      )
    : catalogEvents;

  // Group catalog events by category
  const grouped = new Map<string, CatalogEvent[]>();
  for (const event of filteredCatalog) {
    const cat = event.category || "other";
    const list = grouped.get(cat) ?? [];
    list.push(event);
    grouped.set(cat, list);
  }

  function handleAdd() {
    if (!selectedSpecEvent || !selectedCatalogEvent) return;
    startTransition(async () => {
      await addEventMapping(
        projectId,
        projectDestinationId,
        selectedSpecEvent,
        selectedCatalogEvent,
      );
      setOpen(false);
      setSelectedSpecEvent("");
      setSelectedCatalogEvent("");
      setCatalogSearch("");
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button disabled={specEvents.length === 0}>
            <Plus className="mr-2 size-4" />
            Add Event
          </Button>
        }
      />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Map Event to Destination</DialogTitle>
          <DialogDescription>
            Select a source spec event and the destination event it should map
            to.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Source Event (your spec)</Label>
            <Select
              value={selectedSpecEvent}
              onValueChange={(v) => setSelectedSpecEvent(v ?? "")}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a spec event..." />
              </SelectTrigger>
              <SelectContent>
                {specEvents.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-center">
            <ArrowRight className="size-4 text-muted-foreground" />
          </div>

          <div className="space-y-2">
            <Label>Destination Event</Label>
            <Input
              placeholder="Search events..."
              value={catalogSearch}
              onChange={(e) => setCatalogSearch(e.target.value)}
            />
            <div className="max-h-48 overflow-y-auto rounded-md border">
              {Array.from(grouped.entries()).map(([category, evts]) => (
                <div key={category}>
                  <div className="sticky top-0 bg-muted px-3 py-1 text-xs font-medium text-muted-foreground capitalize">
                    {category.replace(/_/g, " ")}
                  </div>
                  {evts.map((e) => (
                    <button
                      key={e.id}
                      onClick={() => setSelectedCatalogEvent(e.id)}
                      className={`w-full text-left px-3 py-1.5 text-sm hover:bg-accent transition-colors ${
                        selectedCatalogEvent === e.id
                          ? "bg-accent font-medium"
                          : ""
                      }`}
                    >
                      {e.name}
                    </button>
                  ))}
                </div>
              ))}
              {filteredCatalog.length === 0 && (
                <p className="px-3 py-4 text-xs text-muted-foreground text-center">
                  No matching events found.
                </p>
              )}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleAdd}
            disabled={!selectedSpecEvent || !selectedCatalogEvent || isPending}
          >
            {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
            Add Mapping
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Scope label helper ───────────────────────────────────────────

const SCOPE_LABELS: Record<string, string> = {
  default: "default",
  custom_dimension: "dim",
  custom_metric: "metric",
  user_property: "user prop",
};

// ── Mapping row ─────────────────────────────────────────────────

export function MappingRow({
  mapping,
  projectId,
  projectDestinationId,
  catalogEvents,
  specParams,
  destParams,
}: {
  mapping: Mapping;
  projectId: string;
  projectDestinationId: string;
  catalogEvents: CatalogEvent[];
  specParams: SpecParam[];
  destParams: DestParam[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [expanded, setExpanded] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [addParamOpen, setAddParamOpen] = useState(false);

  return (
    <>
      <TableRow
        className="cursor-pointer hover:bg-muted/50"
        onClick={() => setExpanded(!expanded)}
      >
        <TableCell>
          <div>
            <span className="font-medium text-sm">
              {mapping.sourceEvent.name}
            </span>
            {mapping.sourceEvent.description && (
              <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                {mapping.sourceEvent.description}
              </p>
            )}
          </div>
        </TableCell>
        <TableCell>
          <ArrowRight className="size-3 text-muted-foreground" />
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">
              {mapping.destEvent.name}
            </span>
            {mapping.destEvent.category && (
              <Badge
                variant="secondary"
                className="text-[10px] px-1.5 py-0"
              >
                {mapping.destEvent.category.replace(/_/g, " ")}
              </Badge>
            )}
          </div>
        </TableCell>
        <TableCell className="text-right">
          <div className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            {mapping.parameterMappings.length}
            <ChevronDown
              className={`size-3 transition-transform ${expanded ? "rotate-180" : ""}`}
            />
          </div>
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="size-7 text-muted-foreground hover:text-foreground"
              onClick={(e) => {
                e.stopPropagation();
                setEditOpen(true);
              }}
            >
              <Pencil className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 text-muted-foreground hover:text-destructive"
              disabled={isPending}
              onClick={(e) => {
                e.stopPropagation();
                startTransition(async () => {
                  await removeEventMapping(
                    projectId,
                    projectDestinationId,
                    mapping.id,
                  );
                  router.refresh();
                });
              }}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        </TableCell>
      </TableRow>
      {expanded && (
        <>
          {mapping.parameterMappings.map((pm) => (
            <TableRow key={pm.id} className="bg-muted/30">
              <TableCell className="pl-8 text-xs text-muted-foreground">
                {pm.sourceParam?.name || (
                  <span className="italic">
                    {pm.mappingType === "static"
                      ? `"${pm.staticValue}"`
                      : "unmapped"}
                  </span>
                )}
              </TableCell>
              <TableCell>
                <ArrowRight className="size-2.5 text-muted-foreground" />
              </TableCell>
              <TableCell className="text-xs">
                <span>{pm.destParam.name}</span>
                <span className="text-muted-foreground ml-1">
                  ({pm.destParam.type})
                </span>
                {pm.destParam.scope && (
                  <Badge
                    variant="outline"
                    className="text-[9px] px-1 py-0 ml-1"
                  >
                    {SCOPE_LABELS[pm.destParam.scope] || pm.destParam.scope}
                  </Badge>
                )}
                {pm.destParam.isRequired && (
                  <Badge
                    variant="secondary"
                    className="text-[9px] px-1 py-0 ml-1"
                  >
                    req
                  </Badge>
                )}
              </TableCell>
              <TableCell />
              <TableCell>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-6 text-muted-foreground hover:text-destructive"
                  disabled={isPending}
                  onClick={(e) => {
                    e.stopPropagation();
                    startTransition(async () => {
                      await removeParameterMapping(
                        projectId,
                        projectDestinationId,
                        pm.id,
                      );
                      router.refresh();
                    });
                  }}
                >
                  <Trash2 className="size-3" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
          <TableRow className="bg-muted/30">
            <TableCell colSpan={5} className="pl-8">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-muted-foreground"
                onClick={(e) => {
                  e.stopPropagation();
                  setAddParamOpen(true);
                }}
              >
                <Plus className="mr-1 size-3" />
                Add Parameter
              </Button>
            </TableCell>
          </TableRow>
        </>
      )}

      <EditMappingDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        mapping={mapping}
        catalogEvents={catalogEvents}
        projectId={projectId}
        projectDestinationId={projectDestinationId}
      />

      <AddParameterMappingDialog
        open={addParamOpen}
        onOpenChange={setAddParamOpen}
        mappingId={mapping.id}
        specParams={specParams}
        destParams={destParams}
        existingParamIds={mapping.parameterMappings.map(
          (pm) => pm.destParam.id,
        )}
        projectId={projectId}
        projectDestinationId={projectDestinationId}
      />
    </>
  );
}

// ── Add parameter mapping dialog ────────────────────────────────

function AddParameterMappingDialog({
  open,
  onOpenChange,
  mappingId,
  specParams,
  destParams,
  existingParamIds,
  projectId,
  projectDestinationId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mappingId: string;
  specParams: SpecParam[];
  destParams: DestParam[];
  existingParamIds: string[];
  projectId: string;
  projectDestinationId: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedDestParam, setSelectedDestParam] = useState("");
  const [selectedSourceParam, setSelectedSourceParam] = useState("");
  const [mappingType, setMappingType] = useState<"reference" | "static">(
    "reference",
  );
  const [staticValue, setStaticValue] = useState("");

  const availableDestParams = destParams.filter(
    (dp) => !existingParamIds.includes(dp.id),
  );

  function handleAdd() {
    if (!selectedDestParam) return;
    startTransition(async () => {
      await addParameterMapping(projectId, projectDestinationId, {
        eventDestinationMappingId: mappingId,
        destinationParameterId: selectedDestParam,
        mappingType,
        sourceParameterId:
          mappingType === "reference" ? selectedSourceParam || undefined : undefined,
        staticValue: mappingType === "static" ? staticValue : undefined,
      });
      onOpenChange(false);
      setSelectedDestParam("");
      setSelectedSourceParam("");
      setMappingType("reference");
      setStaticValue("");
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Parameter Mapping</DialogTitle>
          <DialogDescription>
            Map a source parameter to a destination parameter.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Destination Parameter</Label>
            <Select
              value={selectedDestParam}
              onValueChange={(v) => setSelectedDestParam(v ?? "")}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select parameter..." />
              </SelectTrigger>
              <SelectContent>
                {availableDestParams.map((dp) => (
                  <SelectItem key={dp.id} value={dp.id}>
                    {dp.name}{" "}
                    {dp.scope && SCOPE_LABELS[dp.scope]
                      ? `(${SCOPE_LABELS[dp.scope]})`
                      : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Mapping Type</Label>
            <Select
              value={mappingType}
              onValueChange={(v) =>
                setMappingType((v as "reference" | "static") ?? "reference")
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="reference">
                  Reference (from spec parameter)
                </SelectItem>
                <SelectItem value="static">Static value</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {mappingType === "reference" ? (
            <div className="space-y-2">
              <Label>Source Parameter</Label>
              <Select
                value={selectedSourceParam}
                onValueChange={(v) => setSelectedSourceParam(v ?? "")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select source parameter..." />
                </SelectTrigger>
                <SelectContent>
                  {specParams.map((sp) => (
                    <SelectItem key={sp.id} value={sp.id}>
                      {sp.name} ({sp.type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Static Value</Label>
              <Input
                value={staticValue}
                onChange={(e) => setStaticValue(e.target.value)}
                placeholder="Enter value..."
              />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleAdd}
            disabled={!selectedDestParam || isPending}
          >
            {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
            Add
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Edit mapping dialog ─────────────────────────────────────────

function EditMappingDialog({
  open,
  onOpenChange,
  mapping,
  catalogEvents,
  projectId,
  projectDestinationId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mapping: Mapping;
  catalogEvents: CatalogEvent[];
  projectId: string;
  projectDestinationId: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedCatalogEvent, setSelectedCatalogEvent] = useState(
    mapping.destEvent.id,
  );
  const [catalogSearch, setCatalogSearch] = useState("");

  const filteredCatalog = catalogSearch
    ? catalogEvents.filter((e) =>
        e.name.toLowerCase().includes(catalogSearch.toLowerCase()),
      )
    : catalogEvents;

  const grouped = new Map<string, CatalogEvent[]>();
  for (const event of filteredCatalog) {
    const cat = event.category || "other";
    const list = grouped.get(cat) ?? [];
    list.push(event);
    grouped.set(cat, list);
  }

  function handleSave() {
    if (!selectedCatalogEvent || selectedCatalogEvent === mapping.destEvent.id)
      return;
    startTransition(async () => {
      await updateEventMapping(
        projectId,
        projectDestinationId,
        mapping.id,
        selectedCatalogEvent,
      );
      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Mapping</DialogTitle>
          <DialogDescription>
            Change the destination event for{" "}
            <span className="font-medium">{mapping.sourceEvent.name}</span>.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Label>Destination Event</Label>
          <Input
            placeholder="Search events..."
            value={catalogSearch}
            onChange={(e) => setCatalogSearch(e.target.value)}
          />
          <div className="max-h-56 overflow-y-auto rounded-md border">
            {Array.from(grouped.entries()).map(([category, evts]) => (
              <div key={category}>
                <div className="sticky top-0 bg-muted px-3 py-1 text-xs font-medium text-muted-foreground capitalize">
                  {category.replace(/_/g, " ")}
                </div>
                {evts.map((e) => (
                  <button
                    key={e.id}
                    onClick={() => setSelectedCatalogEvent(e.id)}
                    className={`w-full text-left px-3 py-1.5 text-sm hover:bg-accent transition-colors ${
                      selectedCatalogEvent === e.id
                        ? "bg-accent font-medium"
                        : ""
                    }`}
                  >
                    {e.name}
                  </button>
                ))}
              </div>
            ))}
            {filteredCatalog.length === 0 && (
              <p className="px-3 py-4 text-xs text-muted-foreground text-center">
                No matching events found.
              </p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={
              !selectedCatalogEvent ||
              selectedCatalogEvent === mapping.destEvent.id ||
              isPending
            }
          >
            {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
