"use client";

import { useState, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  Columns3,
  Group,
  ChevronDown,
  MoreHorizontal,
  Pencil,
  Trash2,
  ExternalLink,
  Type,
  Zap,
  Tag,
  FileText,
  Braces,
  Globe,
  Code,
  SlidersHorizontal,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
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
import { DraggableTableHeader } from "@/components/draggable-table-header";
import { CustomFieldCell } from "@/components/custom-field-cell";
import { AddColumnButton } from "@/components/add-column-button";
import { useColumnOrder, type ColumnDef } from "@/hooks/use-column-order";
import { EditEventDialog } from "./edit-event-dialog";
import { DeleteEventDialog } from "./delete-event-dialog";
import { ParamHoverCard } from "./param-hover-card";
import { upsertCustomFieldValue } from "./actions";
import { createCustomFieldDefinition } from "../../settings/actions";
import type { Event, CustomFieldDefinition, CustomFieldValue } from "@/types";

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

interface EventRow {
  event: Event;
  params: EventParam[];
}

interface EventsTableProps {
  projectId: string;
  workspaceId: string;
  rows: EventRow[];
  readOnly?: boolean;
  customFieldDefinitions?: CustomFieldDefinition[];
  customFieldValues?: CustomFieldValue[];
}

const BUILTIN_COLUMNS: ColumnDef[] = [
  { id: "name", label: "Name", alwaysVisible: true, icon: Type },
  { id: "trigger", label: "Trigger", icon: Zap },
  { id: "category", label: "Category", icon: Tag },
  { id: "pagePattern", label: "Page pattern", icon: Globe },
  { id: "description", label: "Description", icon: FileText },
  { id: "parameters", label: "Parameters", icon: Braces },
  { id: "codeExample", label: "Code example", icon: Code },
];

const DEFAULT_VISIBLE = ["name", "trigger", "category", "parameters"];

const STORAGE_KEY = "events-table-prefs";

export function EventsTable({
  projectId,
  workspaceId,
  rows,
  readOnly = false,
  customFieldDefinitions: cfDefs = [],
  customFieldValues: cfValues = [],
}: EventsTableProps) {
  // Build column list: built-in + custom fields for events
  const eventCfDefs = useMemo(
    () => cfDefs.filter((d) => d.entityType === "event"),
    [cfDefs]
  );

  const allColumns = useMemo<ColumnDef[]>(
    () => [
      ...BUILTIN_COLUMNS,
      ...eventCfDefs.map((d) => ({ id: `cf_${d.id}`, label: d.name, icon: SlidersHorizontal })),
    ],
    [eventCfDefs]
  );

  const {
    visibleColumns,
    groupBy,
    groupableColumns,
    isVisible,
    toggleColumn,
    moveColumn,
    setGroupBy,
  } = useColumnOrder(STORAGE_KEY, allColumns, DEFAULT_VISIBLE);

  // Build custom field value lookup: Map<eventId, Map<definitionId, value>>
  const cfValueMap = useMemo(() => {
    const map = new Map<string, Map<string, unknown>>();
    for (const v of cfValues) {
      if (!v.eventId) continue;
      let inner = map.get(v.eventId);
      if (!inner) {
        inner = new Map();
        map.set(v.eventId, inner);
      }
      inner.set(v.customFieldDefinitionId, v.value);
    }
    return map;
  }, [cfValues]);

  const cfDefById = useMemo(() => {
    const map = new Map<string, CustomFieldDefinition>();
    for (const d of eventCfDefs) {
      map.set(d.id, d);
    }
    return map;
  }, [eventCfDefs]);

  const handleSaveCustomField = useCallback(
    async (eventId: string, definitionId: string, value: unknown) => {
      await upsertCustomFieldValue(
        projectId,
        workspaceId,
        definitionId,
        eventId,
        "event",
        value
      );
    },
    [projectId, workspaceId]
  );

  const handleAddColumn = useCallback(
    async (formData: FormData) => {
      await createCustomFieldDefinition(projectId, formData);
    },
    [projectId]
  );

  const grouped = buildGroups(rows, groupBy);

  return (
    <div className="space-y-2">
      {/* Toolbar */}
      <div className="flex items-center gap-2 justify-end">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="outline" size="sm" nativeButton={false}>
                <Group className="mr-2 size-4" />
                {groupBy
                  ? `Grouped by ${allColumns.find((c) => c.id === groupBy)?.label}`
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
              {allColumns
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
          <DraggableTableHeader
            columns={visibleColumns}
            onReorder={moveColumn}
            extraHeads={
              !readOnly ? (
                <>
                  <TableHead className="w-[50px]" />
                  <AddColumnButton onAdd={handleAddColumn} entityType="event" />
                </>
              ) : undefined
            }
          />
          <TableBody>
            {grouped.map((group) => (
              <GroupRows
                key={group.key}
                group={group}
                visibleCols={visibleColumns}
                projectId={projectId}
                workspaceId={workspaceId}
                isGrouped={groupBy !== null}
                readOnly={readOnly}
                cfDefById={cfDefById}
                cfValueMap={cfValueMap}
                onSaveCustomField={handleSaveCustomField}
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

function getGroupValue(row: EventRow, col: string): string {
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

function buildGroups(rows: EventRow[], groupBy: string | null): EventGroup[] {
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
  cfDefById,
  cfValueMap,
  onSaveCustomField,
}: {
  group: EventGroup;
  visibleCols: ColumnDef[];
  projectId: string;
  workspaceId: string;
  isGrouped: boolean;
  readOnly: boolean;
  cfDefById: Map<string, CustomFieldDefinition>;
  cfValueMap: Map<string, Map<string, unknown>>;
  onSaveCustomField: (eventId: string, definitionId: string, value: unknown) => Promise<void>;
}) {
  // +1 for actions column, +1 for add-column button (both only in edit mode)
  const colSpan = visibleCols.length + (readOnly ? 0 : 2);

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
          cfDefById={cfDefById}
          cfValueMap={cfValueMap}
          onSaveCustomField={onSaveCustomField}
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
  cfDefById,
  cfValueMap,
  onSaveCustomField,
}: {
  row: EventRow;
  visibleCols: ColumnDef[];
  projectId: string;
  workspaceId: string;
  readOnly: boolean;
  cfDefById: Map<string, CustomFieldDefinition>;
  cfValueMap: Map<string, Map<string, unknown>>;
  onSaveCustomField: (eventId: string, definitionId: string, value: unknown) => Promise<void>;
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
            readOnly={readOnly}
            cfDefById={cfDefById}
            cfValueMap={cfValueMap}
            onSaveCustomField={onSaveCustomField}
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
            customFieldDefinitions={Array.from(cfDefById.values())}
            customFieldValues={cfValueMap.get(row.event.id)}
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
      {!readOnly && <TableCell />}
    </TableRow>
  );
}

function CellContent({
  col,
  row,
  projectId,
  workspaceId,
  readOnly,
  cfDefById,
  cfValueMap,
  onSaveCustomField,
}: {
  col: string;
  row: EventRow;
  projectId: string;
  workspaceId: string;
  readOnly: boolean;
  cfDefById: Map<string, CustomFieldDefinition>;
  cfValueMap: Map<string, Map<string, unknown>>;
  onSaveCustomField: (eventId: string, definitionId: string, value: unknown) => Promise<void>;
}) {
  // Custom field column
  if (col.startsWith("cf_")) {
    const defId = col.slice(3);
    const def = cfDefById.get(defId);
    if (!def) return <span className="text-muted-foreground">—</span>;

    const eventValues = cfValueMap.get(row.event.id);
    const value = eventValues?.get(defId) ?? null;

    return (
      <CustomFieldCell
        definition={def}
        value={value}
        readOnly={readOnly}
        onSave={async (definitionId, newValue) => {
          await onSaveCustomField(row.event.id, definitionId, newValue);
        }}
      />
    );
  }

  // Built-in columns
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
            <ParamHoverCard
              key={p.id}
              param={p}
              projectId={projectId}
              workspaceId={workspaceId}
              readOnly={readOnly}
            />
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
    default:
      return null;
  }
}
