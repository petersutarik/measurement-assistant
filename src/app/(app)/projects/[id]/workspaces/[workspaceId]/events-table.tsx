"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import {
  Columns3,
  Group,
  ChevronDown,
  MoreHorizontal,
  Pencil,
  Trash2,
  ExternalLink,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { EditEventDialog } from "./edit-event-dialog";
import { DeleteEventDialog } from "./delete-event-dialog";
import type { Event } from "@/types";

interface EventParam {
  id: string;
  eventId: string;
  name: string;
  type: string;
  isRequired: boolean;
  exampleValue: string | null;
}

interface EventRow {
  event: Event;
  params: EventParam[];
}

interface EventsTableProps {
  projectId: string;
  workspaceId: string;
  rows: EventRow[];
  readOnly?: boolean;
}

type ColumnId =
  | "name"
  | "trigger"
  | "category"
  | "pagePattern"
  | "description"
  | "parameters"
  | "codeExample";

interface ColumnDef {
  id: ColumnId;
  label: string;
  alwaysVisible?: boolean;
}

const columns: ColumnDef[] = [
  { id: "name", label: "Name", alwaysVisible: true },
  { id: "trigger", label: "Trigger" },
  { id: "category", label: "Category" },
  { id: "pagePattern", label: "Page pattern" },
  { id: "description", label: "Description" },
  { id: "parameters", label: "Parameters" },
  { id: "codeExample", label: "Code example" },
];

const defaultVisibleIds: ColumnId[] = [
  "name",
  "trigger",
  "category",
  "parameters",
];

const STORAGE_KEY = "events-table-prefs";

type GroupByColumn = ColumnId | null;

interface StoredPrefs {
  visibleColumns: ColumnId[];
  groupBy: GroupByColumn;
}

function loadPrefs(): { visibleColumns: Set<ColumnId>; groupBy: GroupByColumn } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed: StoredPrefs = JSON.parse(raw);
      return {
        visibleColumns: new Set(parsed.visibleColumns),
        groupBy: parsed.groupBy,
      };
    }
  } catch {
    // ignore
  }
  return { visibleColumns: new Set(defaultVisibleIds), groupBy: null };
}

function savePrefs(visibleColumns: Set<ColumnId>, groupBy: GroupByColumn) {
  const prefs: StoredPrefs = {
    visibleColumns: Array.from(visibleColumns),
    groupBy,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
}

export function EventsTable({
  projectId,
  workspaceId,
  rows,
  readOnly = false,
}: EventsTableProps) {
  const [visibleColumns, setVisibleColumns] = useState<Set<ColumnId>>(
    () => new Set(defaultVisibleIds)
  );
  const [groupBy, setGroupBy] = useState<GroupByColumn>(null);
  const [hydrated, setHydrated] = useState(false);

  // Load from localStorage after mount
  useEffect(() => {
    const prefs = loadPrefs();
    setVisibleColumns(prefs.visibleColumns);
    setGroupBy(prefs.groupBy);
    setHydrated(true);
  }, []);

  // Persist on change (skip initial hydration)
  useEffect(() => {
    if (hydrated) {
      savePrefs(visibleColumns, groupBy);
    }
  }, [visibleColumns, groupBy, hydrated]);

  const toggleColumn = useCallback(
    (id: ColumnId) => {
      setVisibleColumns((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
          if (groupBy === id) setGroupBy(null);
        } else {
          next.add(id);
        }
        return next;
      });
    },
    [groupBy]
  );

  const isVisible = (id: ColumnId) => visibleColumns.has(id);

  // All visible non-alwaysVisible columns can be grouped
  const groupableColumns = columns.filter(
    (c) => !c.alwaysVisible && visibleColumns.has(c.id)
  );

  // Build grouped rows
  const grouped = buildGroups(rows, groupBy);

  const visibleCols = columns.filter(
    (c) => c.alwaysVisible || visibleColumns.has(c.id)
  );

  return (
    <div className="space-y-2">
      {/* Toolbar */}
      <div className="flex items-center gap-2 justify-end">
        {/* Group by */}
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="outline" size="sm" nativeButton={false}>
                <Group className="mr-2 size-4" />
                {groupBy
                  ? `Grouped by ${columns.find((c) => c.id === groupBy)?.label}`
                  : "Group by"}
                <ChevronDown className="ml-2 size-3" />
              </Button>
            }
          />
          <DropdownMenuContent align="end">
            <DropdownMenuGroup>
              <DropdownMenuLabel>Group by column</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setGroupBy(null)}>
                None{!groupBy && " ✓"}
              </DropdownMenuItem>
              {groupableColumns.map((col) => (
                <DropdownMenuItem
                  key={col.id}
                  onClick={() => setGroupBy(col.id)}
                >
                  {col.label}
                  {groupBy === col.id && " ✓"}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Column visibility */}
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="outline" size="sm" nativeButton={false}>
                <Columns3 className="mr-2 size-4" />
                Columns
                <ChevronDown className="ml-2 size-3" />
              </Button>
            }
          />
          <DropdownMenuContent align="end">
            <DropdownMenuGroup>
              <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {columns
                .filter((c) => !c.alwaysVisible)
                .map((col) => (
                  <DropdownMenuCheckboxItem
                    key={col.id}
                    checked={isVisible(col.id)}
                    onCheckedChange={() => toggleColumn(col.id)}
                  >
                    {col.label}
                  </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {visibleCols.map((col) => (
                <TableHead key={col.id}>{col.label}</TableHead>
              ))}
              {!readOnly && <TableHead className="w-[50px]" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {grouped.map((group) => (
              <GroupRows
                key={group.key}
                group={group}
                visibleCols={visibleCols}
                projectId={projectId}
                workspaceId={workspaceId}
                isGrouped={groupBy !== null}
                readOnly={readOnly}
              />
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// --- Grouping logic ---

interface EventGroup {
  key: string;
  label: string;
  rows: EventRow[];
}

function getGroupValue(row: EventRow, col: ColumnId): string {
  switch (col) {
    case "category":
      return row.event.category ?? "";
    case "trigger":
      return row.event.trigger ?? "";
    case "pagePattern":
      return row.event.pagePattern ?? "";
    case "description":
      return row.event.description ?? "";
    case "parameters":
      return row.params.map((p) => p.name).join(", ");
    default:
      return "";
  }
}

function buildGroups(rows: EventRow[], groupBy: GroupByColumn): EventGroup[] {
  if (!groupBy) {
    return [{ key: "__all", label: "", rows }];
  }

  const map = new Map<string, EventRow[]>();
  for (const row of rows) {
    const val = getGroupValue(row, groupBy) || "(none)";
    const existing = map.get(val);
    if (existing) {
      existing.push(row);
    } else {
      map.set(val, [row]);
    }
  }

  return Array.from(map.entries()).map(([key, groupRows]) => ({
    key,
    label: key,
    rows: groupRows,
  }));
}

// --- Code example builder ---

function buildCodeExample(event: Event, params: EventParam[]): string {
  if (params.length === 0) {
    return `dataLayer.push({ event: '${event.name}' });`;
  }

  const paramEntries = params
    .map((p) => {
      const val = p.exampleValue ?? exampleForType(p.type);
      return `  ${p.name}: ${val}`;
    })
    .join(",\n");

  return `dataLayer.push({\n  event: '${event.name}',\n${paramEntries}\n});`;
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

// --- Row rendering ---

function GroupRows({
  group,
  visibleCols,
  projectId,
  workspaceId,
  isGrouped,
  readOnly,
}: {
  group: EventGroup;
  visibleCols: ColumnDef[];
  projectId: string;
  workspaceId: string;
  isGrouped: boolean;
  readOnly: boolean;
}) {
  const colSpan = visibleCols.length + (readOnly ? 0 : 1);

  return (
    <>
      {isGrouped && (
        <TableRow>
          <TableCell
            colSpan={colSpan}
            className="bg-muted/50 py-2 font-medium text-sm"
          >
            {group.label}{" "}
            <span className="text-muted-foreground font-normal">
              ({group.rows.length})
            </span>
          </TableCell>
        </TableRow>
      )}
      {group.rows.map((row) => (
        <EventRowComponent
          key={row.event.id}
          row={row}
          visibleCols={visibleCols}
          projectId={projectId}
          workspaceId={workspaceId}
          readOnly={readOnly}
        />
      ))}
    </>
  );
}

function EventRowComponent({
  row,
  visibleCols,
  projectId,
  workspaceId,
  readOnly,
}: {
  row: EventRow;
  visibleCols: ColumnDef[];
  projectId: string;
  workspaceId: string;
  readOnly: boolean;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const eventUrl = `/projects/${projectId}/workspaces/${workspaceId}/events/${row.event.id}`;

  return (
    <TableRow>
      {visibleCols.map((col) => (
        <TableCell key={col.id}>
          <CellContent
            col={col.id}
            row={row}
            projectId={projectId}
            workspaceId={workspaceId}
          />
        </TableCell>
      ))}
      {!readOnly && (
        <TableCell>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="ghost" size="icon" nativeButton={false}>
                  <MoreHorizontal className="size-4" />
                </Button>
              }
            />
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setEditOpen(true)}>
                <Pencil className="mr-2 size-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setDeleteOpen(true)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 size-4" />
                Delete
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => window.location.assign(eventUrl)}
              >
                <ExternalLink className="mr-2 size-4" />
                View details
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <EditEventDialog
            projectId={projectId}
            workspaceId={workspaceId}
            event={row.event}
            open={editOpen}
            onOpenChange={setEditOpen}
          />
          <DeleteEventDialog
            projectId={projectId}
            workspaceId={workspaceId}
            event={row.event}
            open={deleteOpen}
            onOpenChange={setDeleteOpen}
          />
        </TableCell>
      )}
    </TableRow>
  );
}

function CellContent({
  col,
  row,
  projectId,
  workspaceId,
}: {
  col: ColumnId;
  row: EventRow;
  projectId: string;
  workspaceId: string;
}) {
  switch (col) {
    case "name":
      return (
        <Link
          href={`/projects/${projectId}/workspaces/${workspaceId}/events/${row.event.id}`}
          className="font-medium hover:underline"
        >
          {row.event.name}
        </Link>
      );
    case "trigger":
      return (
        <span className="text-muted-foreground">
          {row.event.trigger ?? "—"}
        </span>
      );
    case "category":
      return row.event.category ? (
        <Badge variant="secondary">{row.event.category}</Badge>
      ) : (
        <span className="text-muted-foreground">—</span>
      );
    case "pagePattern":
      return (
        <span className="text-muted-foreground font-mono text-xs">
          {row.event.pagePattern ?? "—"}
        </span>
      );
    case "description":
      return (
        <span className="text-muted-foreground text-sm line-clamp-1">
          {row.event.description ?? "—"}
        </span>
      );
    case "parameters":
      return row.params.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {row.params.map((p) => (
            <Badge key={p.id} variant="outline" className="text-xs font-mono">
              {p.name}
              <span className="ml-1 text-muted-foreground font-sans">
                {p.type}
              </span>
            </Badge>
          ))}
        </div>
      ) : (
        <span className="text-muted-foreground">—</span>
      );
    case "codeExample":
      return (
        <pre className="text-xs font-mono bg-muted rounded px-2 py-1 whitespace-pre overflow-x-auto max-w-sm">
          {buildCodeExample(row.event, row.params)}
        </pre>
      );
  }
}
