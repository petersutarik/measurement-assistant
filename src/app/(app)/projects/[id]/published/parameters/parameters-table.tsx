"use client";

import { useMemo } from "react";
import {
  Columns3,
  Group,
  ChevronDown,
  Type,
  Braces,
  ShieldCheck,
  FileText,
  Code,
  Layers,
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
import { ParamTypeIcon } from "@/components/param-type-icon";
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
import { useColumnOrder, type ColumnDef } from "@/hooks/use-column-order";
import type { CustomFieldDefinition, CustomFieldValue } from "@/types";

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
  customFieldDefinitions?: CustomFieldDefinition[];
  customFieldValues?: CustomFieldValue[];
}

const BUILTIN_COLUMNS: ColumnDef[] = [
  { id: "name", label: "Name", alwaysVisible: true, icon: Type },
  { id: "type", label: "Type", icon: Braces },
  { id: "required", label: "Required", icon: ShieldCheck },
  { id: "description", label: "Description", icon: FileText },
  { id: "exampleValue", label: "Example value", icon: Code },
  { id: "events", label: "Events", icon: Layers },
];

const DEFAULT_VISIBLE = ["name", "type", "required", "events"];

const STORAGE_KEY = "params-table-prefs";

export function ParametersTable({
  rows,
  customFieldDefinitions: cfDefs = [],
  customFieldValues: cfValues = [],
}: ParametersTableProps) {
  const paramCfDefs = useMemo(
    () => cfDefs.filter((d) => d.entityType === "parameter"),
    [cfDefs]
  );

  const allColumns = useMemo<ColumnDef[]>(
    () => [
      ...BUILTIN_COLUMNS,
      ...paramCfDefs.map((d) => ({ id: `cf_${d.id}`, label: d.name, icon: SlidersHorizontal })),
    ],
    [paramCfDefs]
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

  // Build custom field value lookup: Map<parameterId, Map<definitionId, value>>
  const cfValueMap = useMemo(() => {
    const map = new Map<string, Map<string, unknown>>();
    for (const v of cfValues) {
      if (!v.parameterId) continue;
      let inner = map.get(v.parameterId);
      if (!inner) {
        inner = new Map();
        map.set(v.parameterId, inner);
      }
      inner.set(v.customFieldDefinitionId, v.value);
    }
    return map;
  }, [cfValues]);

  const cfDefById = useMemo(() => {
    const map = new Map<string, CustomFieldDefinition>();
    for (const d of paramCfDefs) {
      map.set(d.id, d);
    }
    return map;
  }, [paramCfDefs]);

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
          />
          <TableBody>
            {grouped.map((group) => (
              <GroupRows
                key={group.key}
                group={group}
                visibleCols={visibleColumns}
                isGrouped={groupBy !== null}
                cfDefById={cfDefById}
                cfValueMap={cfValueMap}
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

function getGroupValue(row: ParameterRow, col: string): string {
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
  groupBy: string | null
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
  cfDefById,
  cfValueMap,
}: {
  group: ParamGroup;
  visibleCols: ColumnDef[];
  isGrouped: boolean;
  cfDefById: Map<string, CustomFieldDefinition>;
  cfValueMap: Map<string, Map<string, unknown>>;
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
              <CellContent
                col={col.id}
                row={row}
                cfDefById={cfDefById}
                cfValueMap={cfValueMap}
              />
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
  cfDefById,
  cfValueMap,
}: {
  col: string;
  row: ParameterRow;
  cfDefById: Map<string, CustomFieldDefinition>;
  cfValueMap: Map<string, Map<string, unknown>>;
}) {
  // Custom field column (read-only in published view)
  if (col.startsWith("cf_")) {
    const defId = col.slice(3);
    const def = cfDefById.get(defId);
    if (!def) return <span className="text-muted-foreground">—</span>;

    const paramValues = cfValueMap.get(row.id);
    const value = paramValues?.get(defId) ?? null;

    return (
      <CustomFieldCell
        definition={def}
        value={value}
        readOnly
        onSave={async () => {}}
      />
    );
  }

  switch (col) {
    case "name":
      return <span className="font-medium font-mono">{row.name}</span>;
    case "type":
      return (
        <Badge variant="secondary" className="gap-1">
          <ParamTypeIcon type={row.type} className="size-3" />
          {row.type}
        </Badge>
      );
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
    default:
      return null;
  }
}
