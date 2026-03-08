"use client";

import { useState, useCallback, useEffect } from "react";
import { Columns3, Group, ChevronDown } from "lucide-react";
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

interface ParameterRow {
  id: string;
  name: string;
  type: string;
  description: string | null;
  isRequired: boolean;
  exampleValue: string | null;
  events: string[];
}

interface ParametersTableProps {
  rows: ParameterRow[];
}

type ColumnId =
  | "name"
  | "type"
  | "required"
  | "description"
  | "exampleValue"
  | "events";

interface ColumnDef {
  id: ColumnId;
  label: string;
  alwaysVisible?: boolean;
}

const columns: ColumnDef[] = [
  { id: "name", label: "Name", alwaysVisible: true },
  { id: "type", label: "Type" },
  { id: "required", label: "Required" },
  { id: "description", label: "Description" },
  { id: "exampleValue", label: "Example value" },
  { id: "events", label: "Events" },
];

const defaultVisibleIds: ColumnId[] = [
  "name",
  "type",
  "required",
  "events",
];

const STORAGE_KEY = "params-table-prefs";

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

export function ParametersTable({ rows }: ParametersTableProps) {
  const [visibleColumns, setVisibleColumns] = useState<Set<ColumnId>>(
    () => new Set(defaultVisibleIds)
  );
  const [groupBy, setGroupBy] = useState<GroupByColumn>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const prefs = loadPrefs();
    setVisibleColumns(prefs.visibleColumns);
    setGroupBy(prefs.groupBy);
    setHydrated(true);
  }, []);

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

  const groupableColumns = columns.filter(
    (c) => !c.alwaysVisible && visibleColumns.has(c.id)
  );

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
            </TableRow>
          </TableHeader>
          <TableBody>
            {grouped.map((group) => (
              <GroupRows
                key={group.key}
                group={group}
                visibleCols={visibleCols}
                isGrouped={groupBy !== null}
              />
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// --- Grouping logic ---

interface ParamGroup {
  key: string;
  label: string;
  rows: ParameterRow[];
}

function getGroupValue(row: ParameterRow, col: ColumnId): string {
  switch (col) {
    case "type":
      return row.type;
    case "required":
      return row.isRequired ? "Required" : "Optional";
    case "description":
      return row.description ?? "";
    case "exampleValue":
      return row.exampleValue ?? "";
    case "events":
      return row.events.join(", ");
    default:
      return "";
  }
}

function buildGroups(
  rows: ParameterRow[],
  groupBy: GroupByColumn
): ParamGroup[] {
  if (!groupBy) {
    return [{ key: "__all", label: "", rows }];
  }

  const map = new Map<string, ParameterRow[]>();
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

// --- Row rendering ---

function GroupRows({
  group,
  visibleCols,
  isGrouped,
}: {
  group: ParamGroup;
  visibleCols: ColumnDef[];
  isGrouped: boolean;
}) {
  return (
    <>
      {isGrouped && (
        <TableRow>
          <TableCell
            colSpan={visibleCols.length}
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
        <TableRow key={row.id}>
          {visibleCols.map((col) => (
            <TableCell key={col.id}>
              <CellContent col={col.id} row={row} />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

function CellContent({
  col,
  row,
}: {
  col: ColumnId;
  row: ParameterRow;
}) {
  switch (col) {
    case "name":
      return <span className="font-medium font-mono">{row.name}</span>;
    case "type":
      return <Badge variant="secondary">{row.type}</Badge>;
    case "required":
      return row.isRequired ? (
        <Badge variant="default" className="text-xs">
          Required
        </Badge>
      ) : (
        <span className="text-muted-foreground text-sm">Optional</span>
      );
    case "description":
      return (
        <span className="text-muted-foreground text-sm line-clamp-1">
          {row.description ?? "—"}
        </span>
      );
    case "exampleValue":
      return row.exampleValue ? (
        <code className="text-xs bg-muted rounded px-1.5 py-0.5">
          {row.exampleValue}
        </code>
      ) : (
        <span className="text-muted-foreground">—</span>
      );
    case "events":
      return (
        <div className="flex flex-wrap gap-1">
          {row.events.map((eventName) => (
            <Badge key={eventName} variant="outline" className="text-xs">
              {eventName}
            </Badge>
          ))}
        </div>
      );
  }
}
