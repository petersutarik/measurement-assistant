"use client";

import { useState, useMemo, useCallback } from "react";
import {
  Columns3,
  Group,
  ChevronDown,
  ChevronRight,
  Type,
  Zap,
  Tag,
  Globe,
  FileText,
  Braces,
  Code,
  Hash,
  ShieldCheck,
  Layers,
  MapPin,
  Star,
  ExternalLink,
  Image,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from "@/components/ui/table";
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
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import { DraggableTableHeader } from "@/components/draggable-table-header";
import { ParamTypeIcon } from "@/components/param-type-icon";
import { useColumnOrder, type ColumnDef } from "@/hooks/use-column-order";

// ── Types ──────────────────────────────────────────────────────────

type ParameterDef = {
  type: string;
  description?: string;
  required?: boolean;
  scope?: string;
  origin?: string;
  exampleValue?: string;
  enum?: string[];
  pattern?: string;
  items?: Record<string, ParameterDef>;
};

type Trigger = {
  name: string;
  trigger: string;
  pagePattern?: string;
  exampleUrl?: string;
  screenshots?: string[];
  source?: string;
  parameters?: string[];
  values?: Record<string, unknown>;
};

type Conversion = {
  isPrimary: boolean;
  valueParameter: string | null;
  currencyParameter: string | null;
};

type EventDef = {
  name: string;
  description?: string;
  category?: string;
  parameters: string[];
  conversion?: Conversion;
  triggers: Trigger[];
};

type EventSettings = {
  parameters: string[];
  userProperties: string[];
};

type TagSettings = {
  template: string;
  notes?: string;
  [key: string]: unknown;
};

type Destination = {
  platform: string;
  config: Record<string, string>;
  consent?: { required: string; mode?: string };
  eventSettings?: EventSettings;
  tagSettings?: TagSettings;
};

type ParameterMapping = {
  source: string;
  dest: string;
  transform?: "direct" | "pluck" | "mapObject";
  field?: string;
  fields?: Record<string, string>;
  description?: string;
  destScope?: "event_parameter" | "user_property";
};

type DestinationMapping = {
  sourceEvent: string;
  mappings: {
    destination: string;
    destinationEvent: string;
    useEventSettings?: boolean;
    parameters: ParameterMapping[];
  }[];
};

export type Spec = {
  version: number;
  project: {
    name: string;
    url?: string;
    type?: string;
    description?: string;
  };
  parameters: Record<string, ParameterDef>;
  events: EventDef[];
  destinations: Destination[];
  destinationMappings: DestinationMapping[];
};

// ── Helpers ────────────────────────────────────────────────────────

function buildParameterUsageMap(events: EventDef[]) {
  const map: Record<string, string[]> = {};
  for (const event of events) {
    for (const param of event.parameters) {
      if (!map[param]) map[param] = [];
      map[param].push(event.name);
    }
  }
  return map;
}

const originColors: Record<string, string> = {
  backend: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  frontend: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  dom: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  computed: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  url: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300",
  cookie: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  static: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300",
};

const categoryColors: Record<string, string> = {
  core: "bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-300",
  ecommerce: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  engagement: "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300",
  lead_generation: "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300",
  content: "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300",
};

function buildCodeExample(event: EventDef, params: Record<string, ParameterDef>): string {
  if (event.parameters.length === 0) {
    return `dataLayer.push({ event: '${event.name}' });`;
  }
  const paramEntries = event.parameters
    .map((name) => {
      const p = params[name];
      const val = p?.exampleValue ?? exampleForType(p?.type ?? "string");
      return `  ${name}: ${val}`;
    })
    .join(",\n");
  return `dataLayer.push({\n  event: '${event.name}',\n${paramEntries}\n});`;
}

function exampleForType(type: string): string {
  switch (type) {
    case "string": return "'...'";
    case "number": return "0";
    case "boolean": return "true";
    case "array": return "[]";
    case "object": return "{}";
    default: return "'...'";
  }
}

// ── Grouping helpers ───────────────────────────────────────────────

interface GroupData<T> { key: string; label: string; rows: T[]; }

function buildGroups<T>(
  rows: T[],
  groupBy: string | null,
  getGroupValue: (row: T, col: string) => string
): GroupData<T>[] {
  if (!groupBy) return [{ key: "__all", label: "", rows }];
  const map = new Map<string, T[]>();
  for (const row of rows) {
    const val = getGroupValue(row, groupBy) || "(none)";
    const existing = map.get(val);
    if (existing) existing.push(row);
    else map.set(val, [row]);
  }
  return Array.from(map.entries()).map(([key, groupRows]) => ({
    key, label: key, rows: groupRows,
  }));
}

function CollapsibleGroupRows<T>({
  group,
  visibleCols,
  isGrouped,
  renderRow,
}: {
  group: GroupData<T>;
  visibleCols: ColumnDef[];
  isGrouped: boolean;
  renderRow: (row: T) => React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <>
      {isGrouped && (
        <TableRow
          className="cursor-pointer hover:bg-muted/70"
          onClick={() => setCollapsed((c) => !c)}
        >
          <TableCell colSpan={visibleCols.length} className="bg-muted/50 py-2 font-medium text-sm">
            <div className="flex items-center gap-1.5">
              {collapsed ? <ChevronRight className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
              {group.label} <span className="text-muted-foreground font-normal">({group.rows.length})</span>
            </div>
          </TableCell>
        </TableRow>
      )}
      {!collapsed && group.rows.map(renderRow)}
    </>
  );
}

// ── Toolbar ────────────────────────────────────────────────────────

function TableToolbar({
  allColumns,
  groupBy,
  groupableColumns,
  isVisible,
  toggleColumn,
  setGroupBy,
}: {
  allColumns: ColumnDef[];
  groupBy: string | null;
  groupableColumns: ColumnDef[];
  isVisible: (id: string) => boolean;
  toggleColumn: (id: string) => void;
  setGroupBy: (id: string | null) => void;
}) {
  return (
    <div className="flex items-center gap-2 justify-end">
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="outline" size="sm" nativeButton={false}>
              <Group className="mr-2 size-4" />
              {groupBy ? `Grouped by ${allColumns.find((c) => c.id === groupBy)?.label}` : "Group by"}
              <ChevronDown className="ml-2 size-3" />
            </Button>
          }
        />
        <DropdownMenuContent align="end">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Group by column</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setGroupBy(null)}>None{!groupBy && " ✓"}</DropdownMenuItem>
            {groupableColumns.map((col) => (
              <DropdownMenuItem key={col.id} onClick={() => setGroupBy(col.id)}>
                {col.label}{groupBy === col.id && " ✓"}
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
            {allColumns.filter((c) => !c.alwaysVisible).map((col) => (
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
  );
}

// ══════════════════════════════════════════════════════════════════
// OVERVIEW
// ══════════════════════════════════════════════════════════════════

function OverviewSection({ spec }: { spec: Spec }) {
  const globalParams = Object.entries(spec.parameters).filter(([, p]) => p.scope === "global");
  const eventParams = Object.entries(spec.parameters).filter(([, p]) => p.scope !== "global");
  const conversionEvents = spec.events.filter((e) => e.conversion);
  const totalTriggers = spec.events.reduce((sum, e) => sum + e.triggers.length, 0);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{spec.project.name}</CardTitle>
          <CardDescription>{spec.project.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard label="Events" value={spec.events.length} />
            <StatCard label="Parameters" value={Object.keys(spec.parameters).length} />
            <StatCard label="Triggers" value={totalTriggers} />
            <StatCard label="Destinations" value={spec.destinations.length} />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card size="sm">
          <CardHeader><CardTitle>Project</CardTitle></CardHeader>
          <CardContent>
            <dl className="space-y-2 text-sm">
              {spec.project.url && <div><dt className="text-muted-foreground">URL</dt><dd className="font-mono text-xs">{spec.project.url}</dd></div>}
              {spec.project.type && <div><dt className="text-muted-foreground">Type</dt><dd className="capitalize">{spec.project.type}</dd></div>}
              <div><dt className="text-muted-foreground">Schema version</dt><dd>v{spec.version}</dd></div>
            </dl>
          </CardContent>
        </Card>

        <Card size="sm">
          <CardHeader><CardTitle>Destinations</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {spec.destinations.map((d) => (
                <div key={d.platform} className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{d.platform}</span>
                    {d.consent && <span className="text-xs text-muted-foreground">{d.consent.required}{d.consent.mode ? ` (${d.consent.mode})` : ""}</span>}
                  </div>
                  <div className="font-mono text-xs text-muted-foreground">
                    {Object.entries(d.config).map(([k, v]) => <span key={k}>{k}: {v}</span>)}
                  </div>
                  {d.eventSettings && (
                    <div className="mt-2 rounded bg-muted/50 p-2 text-xs">
                      <span className="font-medium">Event Settings Variable</span>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {d.eventSettings.userProperties.map((p) => (
                          <span key={p} className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-medium text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-300">
                            {p} <span className="opacity-60">user prop</span>
                          </span>
                        ))}
                        {d.eventSettings.parameters.map((p) => (
                          <span key={p} className="inline-flex items-center gap-1 rounded-full bg-teal-100 px-2 py-0.5 text-[10px] font-medium text-teal-700 dark:bg-teal-900/20 dark:text-teal-300">
                            {p} <span className="opacity-60">event param</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {d.tagSettings && (
                    <div className="mt-2 rounded bg-muted/50 p-2 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Tag Template</span>
                        <code className="rounded bg-muted px-1.5 py-0.5 text-[10px]">{d.tagSettings.template}</code>
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {Object.entries(d.tagSettings)
                          .filter(([k]) => k !== "template" && k !== "notes")
                          .map(([k, v]) => (
                            <span
                              key={k}
                              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                                v === true
                                  ? "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300"
                                  : v === false
                                    ? "bg-gray-100 text-gray-500 dark:bg-gray-900/20 dark:text-gray-400"
                                    : "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300"
                              }`}
                            >
                              {k}: {String(v)}
                            </span>
                          ))}
                      </div>
                      {d.tagSettings.notes && (
                        <p className="mt-1.5 text-[10px] text-muted-foreground leading-relaxed">{d.tagSettings.notes}</p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card size="sm">
          <CardHeader><CardTitle>Summary</CardTitle></CardHeader>
          <CardContent>
            <dl className="space-y-2 text-sm">
              <div><dt className="text-muted-foreground">Global parameters</dt><dd>{globalParams.length}</dd></div>
              <div><dt className="text-muted-foreground">Event parameters</dt><dd>{eventParams.length}</dd></div>
              <div>
                <dt className="text-muted-foreground">Conversion events</dt>
                <dd>
                  {conversionEvents.map((e) => (
                    <Badge key={e.name} variant={e.conversion?.isPrimary ? "default" : "secondary"} className="mr-1">{e.name}</Badge>
                  ))}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// PARAMETERS TABLE (matches app's ParametersTable pattern)
// ══════════════════════════════════════════════════════════════════

interface ParameterRow {
  id: string;
  name: string;
  type: string;
  description: string | null;
  isRequired: boolean;
  exampleValue: string | null;
  origin: string | null;
  scope: string;
  enumValues: string[] | null;
  items: Record<string, ParameterDef> | null;
  events: string[];
}

const PARAM_COLUMNS: ColumnDef[] = [
  { id: "name", label: "Name", alwaysVisible: true, icon: Type },
  { id: "type", label: "Type", icon: Braces },
  { id: "required", label: "Required", icon: ShieldCheck },
  { id: "origin", label: "Origin", icon: MapPin },
  { id: "description", label: "Description", icon: FileText },
  { id: "exampleValue", label: "Example", icon: Code },
  { id: "events", label: "Events", icon: Layers },
];

const PARAM_DEFAULT_VISIBLE = ["name", "type", "required", "origin", "events"];

function buildParamRows(spec: Spec): { global: ParameterRow[]; event: ParameterRow[] } {
  const usageMap = buildParameterUsageMap(spec.events);
  const global: ParameterRow[] = [];
  const event: ParameterRow[] = [];

  for (const [name, param] of Object.entries(spec.parameters)) {
    const row: ParameterRow = {
      id: name,
      name,
      type: param.type,
      description: param.description ?? null,
      isRequired: param.required ?? false,
      exampleValue: param.exampleValue ?? null,
      origin: param.origin ?? null,
      scope: param.scope ?? "event",
      enumValues: param.enum ?? null,
      items: param.items ?? null,
      events: usageMap[name] ?? [],
    };
    if (param.scope === "global") global.push(row);
    else event.push(row);
  }
  return { global, event };
}

function ParametersSection({ spec }: { spec: Spec }) {
  const { global, event } = useMemo(() => buildParamRows(spec), [spec]);

  return (
    <div className="space-y-6">
      {global.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Global Parameters</CardTitle>
            <CardDescription>Automatically included on every event</CardDescription>
          </CardHeader>
          <CardContent>
            <SpecParametersTable rows={global} storageKey="spec-global-params-prefs" showEvents={false} />
          </CardContent>
        </Card>
      )}
      <Card>
        <CardHeader>
          <CardTitle>Event Parameters</CardTitle>
          <CardDescription>Referenced by specific events</CardDescription>
        </CardHeader>
        <CardContent>
          <SpecParametersTable rows={event} storageKey="spec-event-params-prefs" showEvents />
        </CardContent>
      </Card>
    </div>
  );
}

function getParamGroupValue(row: ParameterRow, col: string): string {
  switch (col) {
    case "type": return row.type;
    case "required": return row.isRequired ? "Required" : "Optional";
    case "origin": return row.origin ?? "(none)";
    default: return "";
  }
}

function SpecParametersTable({ rows, storageKey, showEvents }: { rows: ParameterRow[]; storageKey: string; showEvents: boolean }) {
  const columns = useMemo(() => showEvents ? PARAM_COLUMNS : PARAM_COLUMNS.filter((c) => c.id !== "events"), [showEvents]);
  const defaultVisible = useMemo(() => showEvents ? PARAM_DEFAULT_VISIBLE : PARAM_DEFAULT_VISIBLE.filter((id) => id !== "events"), [showEvents]);

  const { visibleColumns, groupBy, groupableColumns, isVisible, toggleColumn, moveColumn, setGroupBy } =
    useColumnOrder(storageKey, columns, defaultVisible);

  const grouped = buildGroups(rows, groupBy, getParamGroupValue);

  return (
    <div className="space-y-2">
      <TableToolbar allColumns={columns} groupBy={groupBy} groupableColumns={groupableColumns} isVisible={isVisible} toggleColumn={toggleColumn} setGroupBy={setGroupBy} />
      <div className="rounded-md border">
        <Table>
          <DraggableTableHeader columns={visibleColumns} onReorder={moveColumn} />
          <TableBody>
            {grouped.map((group) => (
              <CollapsibleGroupRows
                key={group.key}
                group={group}
                visibleCols={visibleColumns}
                isGrouped={groupBy !== null}
                renderRow={(row) => (
                  <ParamRowWithItems key={row.id} row={row} visibleCols={visibleColumns} />
                )}
              />
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function ParamRowWithItems({ row, visibleCols }: { row: ParameterRow; visibleCols: ColumnDef[] }) {
  const [expanded, setExpanded] = useState(false);
  const hasItems = row.items && Object.keys(row.items).length > 0;

  return (
    <>
      <TableRow
        className={hasItems ? "cursor-pointer hover:bg-muted/30" : ""}
        onClick={() => hasItems && setExpanded(!expanded)}
      >
        {visibleCols.map((col) => (
          <TableCell key={col.id}>
            <ParamCellContent col={col.id} row={row} expanded={expanded} />
          </TableCell>
        ))}
      </TableRow>
      {expanded && row.items && (
        <NestedPropertyRows
          items={row.items}
          parentPath={row.name}
          parentType={row.type}
          visibleCols={visibleCols}
          depth={1}
        />
      )}
    </>
  );
}

function NestedPropertyRows({
  items,
  parentPath,
  parentType,
  visibleCols,
  depth,
}: {
  items: Record<string, ParameterDef>;
  parentPath: string;
  parentType: string;
  visibleCols: ColumnDef[];
  depth: number;
}) {
  return (
    <>
      {Object.entries(items).map(([key, def]) => (
        <NestedPropertyRow
          key={key}
          name={key}
          def={def}
          parentPath={parentPath}
          parentType={parentType}
          visibleCols={visibleCols}
          depth={depth}
        />
      ))}
    </>
  );
}

function NestedPropertyRow({
  name,
  def,
  parentPath,
  parentType,
  visibleCols,
  depth,
}: {
  name: string;
  def: ParameterDef;
  parentPath: string;
  parentType: string;
  visibleCols: ColumnDef[];
  depth: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasItems = def.items && Object.keys(def.items).length > 0;
  const prefix = `${parentPath}${parentType === "array" ? "[]" : ""}.`;
  const fullPath = `${prefix}${name}`;

  return (
    <>
      <TableRow
        className={hasItems ? "cursor-pointer bg-muted/20 hover:bg-muted/30" : "bg-muted/20 hover:bg-muted/30"}
        onClick={() => hasItems && setExpanded(!expanded)}
      >
        {visibleCols.map((col, i) => (
          <TableCell key={col.id} style={i === 0 ? { paddingLeft: `${depth * 1.5 + 0.5}rem` } : undefined}>
            <ItemPropertyCellContent col={col.id} name={name} def={def} prefix={prefix} hasItems={hasItems} expanded={expanded} />
          </TableCell>
        ))}
      </TableRow>
      {expanded && def.items && (
        <NestedPropertyRows
          items={def.items}
          parentPath={fullPath}
          parentType={def.type}
          visibleCols={visibleCols}
          depth={depth + 1}
        />
      )}
    </>
  );
}

function ItemPropertyCellContent({ col, name, def, prefix, hasItems, expanded }: { col: string; name: string; def: ParameterDef; prefix: string; hasItems?: boolean; expanded?: boolean }) {
  switch (col) {
    case "name":
      return (
        <div className="flex items-center gap-1.5">
          {hasItems && (
            expanded ? <ChevronDown className="size-3.5 text-muted-foreground" /> : <ChevronRight className="size-3.5 text-muted-foreground" />
          )}
          <span className="text-sm text-muted-foreground">
            <span className="opacity-50">{prefix}</span>
            <span className="font-mono font-medium">{name}</span>
          </span>
          {hasItems && (
            <span className="text-xs text-muted-foreground">({Object.keys(def.items!).length} properties)</span>
          )}
        </div>
      );
    case "type":
      return (
        <Badge variant="secondary" className="gap-1 text-xs">
          <ParamTypeIcon type={def.type} className="size-3" />
          {def.type}
          {def.enum && <span className="text-muted-foreground">enum</span>}
        </Badge>
      );
    case "required":
      return def.required ? (
        <Badge variant="default" className="text-xs">Required</Badge>
      ) : (
        <span className="text-muted-foreground text-sm">Optional</span>
      );
    case "origin":
      return def.origin ? (
        <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${originColors[def.origin] || ""}`}>
          {def.origin}
        </span>
      ) : <span className="text-muted-foreground">—</span>;
    case "description":
      return <span className="text-muted-foreground text-sm line-clamp-1">{def.description ?? "—"}</span>;
    case "exampleValue":
      return def.exampleValue ? (
        <code className="text-xs bg-muted rounded px-1.5 py-0.5">{def.exampleValue}</code>
      ) : <span className="text-muted-foreground">—</span>;
    case "events":
      return null;
    default:
      return null;
  }
}

function ParamCellContent({ col, row, expanded }: { col: string; row: ParameterRow; expanded?: boolean }) {
  const hasItems = row.items && Object.keys(row.items).length > 0;

  switch (col) {
    case "name":
      return (
        <div className="flex items-center gap-1.5">
          {hasItems && (
            expanded ? <ChevronDown className="size-3.5 text-muted-foreground" /> : <ChevronRight className="size-3.5 text-muted-foreground" />
          )}
          <span className="font-medium font-mono">{row.name}</span>
          {hasItems && (
            <span className="text-xs text-muted-foreground">({Object.keys(row.items!).length} properties)</span>
          )}
        </div>
      );
    case "type":
      return (
        <Badge variant="secondary" className="gap-1">
          <ParamTypeIcon type={row.type} className="size-3" />
          {row.type}
          {row.enumValues && <span className="text-muted-foreground">enum</span>}
        </Badge>
      );
    case "required":
      return row.isRequired ? (
        <Badge variant="default" className="text-xs">Required</Badge>
      ) : (
        <span className="text-muted-foreground text-sm">Optional</span>
      );
    case "origin":
      return row.origin ? (
        <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${originColors[row.origin] || ""}`}>
          {row.origin}
        </span>
      ) : <span className="text-muted-foreground">—</span>;
    case "description":
      return <span className="text-muted-foreground text-sm line-clamp-1">{row.description ?? "—"}</span>;
    case "exampleValue":
      return row.exampleValue ? (
        <code className="text-xs bg-muted rounded px-1.5 py-0.5">{row.exampleValue}</code>
      ) : <span className="text-muted-foreground">—</span>;
    case "events":
      return (
        <div className="flex flex-wrap gap-1">
          {row.events.map((eventName) => (
            <Badge key={eventName} variant="outline" className="text-xs">{eventName}</Badge>
          ))}
        </div>
      );
    default:
      return null;
  }
}

// ══════════════════════════════════════════════════════════════════
// EVENTS TABLE (matches app's EventsTable pattern)
// ══════════════════════════════════════════════════════════════════

interface EventRow {
  event: EventDef;
  paramNames: string[];
}

const EVENT_COLUMNS: ColumnDef[] = [
  { id: "name", label: "Name", alwaysVisible: true, icon: Type },
  { id: "trigger", label: "Trigger", icon: Zap },
  { id: "category", label: "Category", icon: Tag },
  { id: "pagePattern", label: "Page pattern", icon: Globe },
  { id: "exampleUrl", label: "Example URL", icon: ExternalLink },
  { id: "screenshots", label: "Screenshots", icon: Image },
  { id: "description", label: "Description", icon: FileText },
  { id: "parameters", label: "Parameters", icon: Braces },
  { id: "conversion", label: "Conversion", icon: Star },
  { id: "codeExample", label: "Code example", icon: Code },
];

const EVENT_DEFAULT_VISIBLE = ["name", "trigger", "category", "parameters", "conversion"];

function getEventGroupValue(row: EventRow, col: string): string {
  switch (col) {
    case "category": return row.event.category ?? "";
    case "trigger": return row.event.triggers.map((t) => t.name).join(", ");
    default: return "";
  }
}

function EventsSection({ spec }: { spec: Spec }) {
  const rows = useMemo<EventRow[]>(
    () => spec.events.map((event) => ({ event, paramNames: event.parameters })),
    [spec.events]
  );

  const { visibleColumns, groupBy, groupableColumns, isVisible, toggleColumn, moveColumn, setGroupBy } =
    useColumnOrder("spec-events-table-prefs", EVENT_COLUMNS, EVENT_DEFAULT_VISIBLE);

  const grouped = buildGroups(rows, groupBy, getEventGroupValue);

  return (
    <div className="space-y-2">
      <TableToolbar allColumns={EVENT_COLUMNS} groupBy={groupBy} groupableColumns={groupableColumns} isVisible={isVisible} toggleColumn={toggleColumn} setGroupBy={setGroupBy} />
      <div className="rounded-md border">
        <Table>
          <DraggableTableHeader columns={visibleColumns} onReorder={moveColumn} />
          <TableBody>
            {grouped.map((group) => (
              <CollapsibleGroupRows
                key={group.key}
                group={group}
                visibleCols={visibleColumns}
                isGrouped={groupBy !== null}
                renderRow={(row) => (
                  <EventRowWithTriggers key={row.event.name} row={row} visibleCols={visibleColumns} spec={spec} />
                )}
              />
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function EventRowWithTriggers({ row, visibleCols, spec }: { row: EventRow; visibleCols: ColumnDef[]; spec: Spec }) {
  const [expanded, setExpanded] = useState(false);
  const multiTrigger = row.event.triggers.length > 1;

  return (
    <>
      <TableRow className={multiTrigger ? "cursor-pointer hover:bg-muted/30" : ""} onClick={() => multiTrigger && setExpanded(!expanded)}>
        {visibleCols.map((col) => (
          <TableCell key={col.id}>
            <EventCellContent col={col.id} row={row} spec={spec} expanded={expanded} />
          </TableCell>
        ))}
      </TableRow>
      {expanded && row.event.triggers.map((trigger) => (
        <TableRow key={trigger.name} className="bg-muted/20 hover:bg-muted/30">
          {visibleCols.map((col, i) => (
            <TableCell key={col.id} className={i === 0 ? "pl-10" : ""}>
              <TriggerCellContent col={col.id} trigger={trigger} eventParams={row.event.parameters} spec={spec} />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

function EventParamBadge({ name, param }: { name: string; param?: ParameterDef }) {
  const [open, setOpen] = useState(false);
  const hasItems = param?.items && Object.keys(param.items).length > 0;

  if (!hasItems) {
    return (
      <Badge variant="outline" className="text-xs font-mono gap-1">
        {name}
        {param && <ParamTypeIcon type={param.type} className="size-3 text-muted-foreground" />}
      </Badge>
    );
  }

  return (
    <div className="inline-flex flex-col">
      <Badge
        variant="outline"
        className="text-xs font-mono gap-1 cursor-pointer hover:bg-muted/50"
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
      >
        {name}
        {param && <ParamTypeIcon type={param.type} className="size-3 text-muted-foreground" />}
        {open ? <ChevronDown className="size-2.5 text-muted-foreground" /> : <ChevronRight className="size-2.5 text-muted-foreground" />}
      </Badge>
      {open && (
        <div className="mt-1 ml-1 rounded border bg-muted/30 px-2 py-1.5">
          <div className="flex flex-col gap-1">
            {Object.entries(param!.items!).map(([key, def]) => {
              const hasNestedItems = def.items && Object.keys(def.items).length > 0;
              return hasNestedItems ? (
                <EventParamBadge key={key} name={key} param={def} />
              ) : (
                <div key={key} className="flex items-baseline gap-1.5 text-[11px]">
                  <code className="font-mono font-medium">{key}</code>
                  <Badge variant="secondary" className="gap-0.5 text-[9px] px-1 py-0">
                    <ParamTypeIcon type={def.type} className="size-2.5" />
                    {def.type}
                  </Badge>
                  {def.required && <span className="text-[9px] font-medium text-red-600 dark:text-red-400">req</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function EventCellContent({ col, row, spec, expanded }: { col: string; row: EventRow; spec: Spec; expanded: boolean }) {
  const singleTrigger = row.event.triggers.length === 1 ? row.event.triggers[0] : null;
  const multiTrigger = row.event.triggers.length > 1;

  switch (col) {
    case "name":
      return (
        <div className="flex items-center gap-1.5">
          {multiTrigger && (
            expanded ? <ChevronDown className="size-3.5 text-muted-foreground" /> : <ChevronRight className="size-3.5 text-muted-foreground" />
          )}
          <span className="font-medium">{row.event.name}</span>
          {multiTrigger && (
            <span className="text-xs text-muted-foreground">({row.event.triggers.length} triggers)</span>
          )}
        </div>
      );
    case "trigger":
      return multiTrigger ? (
        <span className="text-muted-foreground">—</span>
      ) : (
        <span className="text-muted-foreground">
          {singleTrigger?.trigger ?? "—"}
        </span>
      );
    case "category":
      return row.event.category ? (
        <Badge variant="secondary" className={categoryColors[row.event.category] || ""}>{row.event.category.replace("_", " ")}</Badge>
      ) : <span className="text-muted-foreground">—</span>;
    case "pagePattern":
      return multiTrigger ? (
        <span className="text-muted-foreground">—</span>
      ) : (
        <span className="text-muted-foreground font-mono text-xs">
          {singleTrigger?.pagePattern ?? "—"}
        </span>
      );
    case "exampleUrl": {
      if (multiTrigger) return <span className="text-muted-foreground">—</span>;
      const url = singleTrigger?.exampleUrl;
      return url ? (
        <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline dark:text-blue-400" onClick={(e) => e.stopPropagation()}>
          <ExternalLink className="size-3" />
          <span className="truncate max-w-[200px]">{url.replace(/^https?:\/\//, "")}</span>
        </a>
      ) : <span className="text-muted-foreground">—</span>;
    }
    case "screenshots": {
      if (multiTrigger) {
        const total = row.event.triggers.reduce((sum, t) => sum + (t.screenshots?.length ?? 0), 0);
        return total > 0 ? (
          <div className="flex items-center gap-1">
            <Image className="size-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">{total}</span>
          </div>
        ) : <span className="text-muted-foreground">—</span>;
      }
      const shots = singleTrigger?.screenshots ?? [];
      return shots.length > 0 ? (
        <div className="flex gap-1.5">
          {shots.map((src, i) => (
            <a key={i} href={src} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
              <img src={src} alt={`Screenshot ${i + 1}`} className="h-8 w-auto rounded border object-cover hover:ring-2 hover:ring-blue-400" />
            </a>
          ))}
        </div>
      ) : <span className="text-muted-foreground">—</span>;
    }
    case "description":
      return <span className="text-muted-foreground text-sm line-clamp-1">{row.event.description ?? "—"}</span>;
    case "parameters":
      return row.paramNames.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {row.paramNames.map((name) => (
            <EventParamBadge key={name} name={name} param={spec.parameters[name]} />
          ))}
        </div>
      ) : <span className="text-muted-foreground">—</span>;
    case "conversion":
      return row.event.conversion ? (
        <Badge variant={row.event.conversion.isPrimary ? "default" : "secondary"} className="text-xs">
          {row.event.conversion.isPrimary ? "Primary" : "Secondary"}
        </Badge>
      ) : <span className="text-muted-foreground text-sm">—</span>;
    case "codeExample":
      return (
        <pre className="text-xs font-mono bg-muted rounded px-2 py-1 whitespace-pre overflow-x-auto max-w-sm">
          {buildCodeExample(row.event, spec.parameters)}
        </pre>
      );
    default:
      return null;
  }
}

function TriggerCellContent({ col, trigger, eventParams, spec }: { col: string; trigger: Trigger; eventParams: string[]; spec: Spec }) {
  switch (col) {
    case "name":
      return <span className="text-sm text-muted-foreground">{trigger.name}</span>;
    case "trigger":
      return <span className="text-muted-foreground text-sm">{trigger.trigger}</span>;
    case "category":
      return trigger.source ? (
        <Badge variant={trigger.source === "server" ? "destructive" : "outline"} className="text-[10px]">{trigger.source}</Badge>
      ) : null;
    case "pagePattern":
      return trigger.pagePattern ? (
        <span className="font-mono text-xs text-muted-foreground">{trigger.pagePattern}</span>
      ) : null;
    case "exampleUrl":
      return trigger.exampleUrl ? (
        <a href={trigger.exampleUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline dark:text-blue-400" onClick={(e) => e.stopPropagation()}>
          <ExternalLink className="size-3" />
          <span className="truncate max-w-[200px]">{trigger.exampleUrl.replace(/^https?:\/\//, "")}</span>
        </a>
      ) : null;
    case "screenshots":
      return trigger.screenshots && trigger.screenshots.length > 0 ? (
        <div className="flex gap-1.5">
          {trigger.screenshots.map((src, i) => (
            <a key={i} href={src} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
              <img src={src} alt={`${trigger.name} screenshot ${i + 1}`} className="h-8 w-auto rounded border object-cover hover:ring-2 hover:ring-blue-400" />
            </a>
          ))}
        </div>
      ) : null;
    case "parameters": {
      const triggerParams = trigger.parameters ?? eventParams;
      const hasSubset = trigger.parameters && trigger.parameters.length !== eventParams.length;
      return (
        <div className="flex flex-wrap gap-1">
          {eventParams.map((name) => {
            const isActive = triggerParams.includes(name);
            const param = spec.parameters[name];
            return (
              <Badge
                key={name}
                variant="outline"
                className={`text-xs font-mono gap-1 ${!isActive ? "opacity-30 line-through" : ""}`}
              >
                {name}
                {param && <ParamTypeIcon type={param.type} className="size-3 text-muted-foreground" />}
              </Badge>
            );
          })}
          {/* Show params only on this trigger (not in event superset — shouldn't happen but safety) */}
          {trigger.parameters?.filter((p) => !eventParams.includes(p)).map((name) => {
            const param = spec.parameters[name];
            return (
              <Badge key={name} variant="outline" className="text-xs font-mono gap-1 border-dashed border-green-500">
                {name}
                {param && <ParamTypeIcon type={param.type} className="size-3 text-muted-foreground" />}
              </Badge>
            );
          })}
        </div>
      );
    }
    default:
      return null;
  }
}

// ══════════════════════════════════════════════════════════════════
// MAPPINGS
// ══════════════════════════════════════════════════════════════════

function MappingsSection({ spec }: { spec: Spec }) {
  const platforms = spec.destinations.map((d) => d.platform);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Event Mapping Matrix</CardTitle>
          <CardDescription>Source events mapped to destination platform events</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <DraggableTableHeader
              columns={[
                { id: "source", label: "Source Event", alwaysVisible: true, icon: Type },
                ...platforms.map((p) => ({ id: p, label: p, icon: Layers })),
              ]}
              onReorder={() => {}}
            />
            <TableBody>
              {spec.destinationMappings.map((dm) => (
                <TableRow key={dm.sourceEvent}>
                  <TableCell><code className="rounded bg-muted px-1.5 py-0.5 text-xs">{dm.sourceEvent}</code></TableCell>
                  {platforms.map((platform) => {
                    const mapping = dm.mappings.find((m) => m.destination === platform);
                    return (
                      <TableCell key={platform}>
                        {mapping ? (
                          <div className="flex items-center gap-1.5">
                            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{mapping.destinationEvent}</code>
                            {mapping.useEventSettings !== false && spec.destinations.find((d) => d.platform === platform)?.eventSettings && (
                              <span className="inline-flex rounded-full bg-teal-100 px-1.5 py-0.5 text-[9px] font-medium text-teal-700 dark:bg-teal-900/20 dark:text-teal-300" title="Uses Event Settings Variable">ES</span>
                            )}
                          </div>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Parameter Mappings</CardTitle>
          <CardDescription>How source parameters map to each destination, including transformations</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {spec.destinationMappings.filter((dm) => dm.mappings.some((m) => m.parameters.length > 0)).map((dm) => (
            <Collapsible key={dm.sourceEvent}>
              <CollapsibleTrigger className="flex w-full items-center gap-3 rounded-lg border p-3 text-left hover:bg-muted/50">
                <code className="font-mono text-sm font-semibold">{dm.sourceEvent}</code>
                <span className="flex-1 text-xs text-muted-foreground">{dm.mappings.length} destination{dm.mappings.length !== 1 ? "s" : ""}</span>
                <ChevronIcon />
              </CollapsibleTrigger>
              <CollapsibleContent className="px-3 pt-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  {dm.mappings.map((mapping) => (
                    <div key={mapping.destination} className="rounded-md border p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{mapping.destination}</span>
                          {mapping.useEventSettings !== false && spec.destinations.find((d) => d.platform === mapping.destination)?.eventSettings && (
                            <span className="inline-flex rounded-full bg-teal-100 px-2 py-0.5 text-[10px] font-medium text-teal-700 dark:bg-teal-900/20 dark:text-teal-300">+ event settings</span>
                          )}
                        </div>
                        <code className="text-xs text-muted-foreground">{mapping.destinationEvent}</code>
                      </div>
                      {mapping.useEventSettings !== false && (() => {
                        const dest = spec.destinations.find((d) => d.platform === mapping.destination);
                        if (!dest?.eventSettings) return null;
                        return (
                          <div className="mb-2 rounded bg-muted/40 p-2">
                            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Inherited from Event Settings</span>
                            <div className="mt-1 flex flex-wrap gap-1">
                              {dest.eventSettings.userProperties.map((p) => (
                                <span key={p} className="inline-flex items-center gap-1 rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-300">{p} <span className="opacity-50">user prop</span></span>
                              ))}
                              {dest.eventSettings.parameters.map((p) => (
                                <span key={p} className="inline-flex items-center gap-1 rounded bg-teal-50 px-1.5 py-0.5 text-[10px] text-teal-700 dark:bg-teal-900/20 dark:text-teal-300">{p} <span className="opacity-50">event param</span></span>
                              ))}
                            </div>
                          </div>
                        );
                      })()}
                      {mapping.parameters.length > 0 ? (
                        <Table>
                          <TableBody>
                            <TableRow className="border-b">
                              <TableCell className="font-medium text-xs text-muted-foreground">Source</TableCell>
                              <TableCell className="font-medium text-xs text-muted-foreground">Destination</TableCell>
                              <TableCell className="font-medium text-xs text-muted-foreground">Transform</TableCell>
                            </TableRow>
                            {mapping.parameters.map((pm) => (
                              <TableRow key={`${pm.source}-${pm.dest}`}>
                                <TableCell><code className="text-xs">{pm.source}</code></TableCell>
                                <TableCell><code className="text-xs">{pm.dest}</code></TableCell>
                                <TableCell><TransformBadge mapping={pm} /></TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      ) : (
                        <p className="text-xs text-muted-foreground">No parameter mapping (platform defaults)</p>
                      )}
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// IMPLEMENTATION
// ══════════════════════════════════════════════════════════════════

function ImplementationSection({ spec }: { spec: Spec }) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Implementation Matrix</CardTitle>
          <CardDescription>All trigger instances with expected parameter values — use as QA checklist</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <DraggableTableHeader
                columns={[
                  { id: "event", label: "Event", alwaysVisible: true, icon: Type },
                  { id: "trigger", label: "Trigger", icon: Zap },
                  { id: "page", label: "Page", icon: Globe },
                  { id: "url", label: "Example URL", icon: ExternalLink },
                  { id: "screenshots", label: "Screenshots", icon: Image },
                  { id: "source", label: "Source", icon: Layers },
                  { id: "values", label: "Expected Values", icon: Code },
                ]}
                onReorder={() => {}}
              />
              <TableBody>
                {spec.events.flatMap((event) =>
                  event.triggers.map((trigger) => (
                    <TableRow key={`${event.name}-${trigger.name}`}>
                      <TableCell><code className="rounded bg-muted px-1.5 py-0.5 text-xs">{event.name}</code></TableCell>
                      <TableCell className="text-xs">{trigger.name}</TableCell>
                      <TableCell>{trigger.pagePattern && <code className="font-mono text-[10px] text-muted-foreground">{trigger.pagePattern}</code>}</TableCell>
                      <TableCell>
                        {trigger.exampleUrl ? (
                          <a href={trigger.exampleUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline dark:text-blue-400">
                            <ExternalLink className="size-3" />
                            <span className="truncate max-w-[150px]">{trigger.exampleUrl.replace(/^https?:\/\//, "")}</span>
                          </a>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell>
                        {trigger.screenshots && trigger.screenshots.length > 0 ? (
                          <div className="flex gap-1.5">
                            {trigger.screenshots.map((src, i) => (
                              <a key={i} href={src} target="_blank" rel="noopener noreferrer">
                                <img src={src} alt={`${trigger.name} screenshot ${i + 1}`} className="h-8 w-auto rounded border object-cover hover:ring-2 hover:ring-blue-400" />
                              </a>
                            ))}
                          </div>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell>{trigger.source && <Badge variant={trigger.source === "server" ? "destructive" : "outline"} className="text-[10px]">{trigger.source}</Badge>}</TableCell>
                      <TableCell className="max-w-[400px]">
                        {trigger.values && Object.keys(trigger.values).length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {Object.entries(trigger.values).map(([k, v]) => (
                              <span key={k} className="inline-flex rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">
                                {k}=<span className="ml-0.5 text-muted-foreground">{typeof v === "object" ? `[${Array.isArray(v) ? v.length : "obj"}]` : String(v)}</span>
                              </span>
                            ))}
                          </div>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Data Origins</CardTitle>
          <CardDescription>Parameters grouped by where the data comes from</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(
              Object.entries(spec.parameters).reduce((acc, [name, param]) => {
                const origin = param.origin || "unknown";
                if (!acc[origin]) acc[origin] = [];
                acc[origin].push(name);
                return acc;
              }, {} as Record<string, string[]>)
            ).map(([origin, params]) => (
              <div key={origin} className="rounded-md border p-3">
                <div className="mb-2 flex items-center gap-2">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${originColors[origin] || ""}`}>{origin}</span>
                  <span className="text-xs text-muted-foreground">{params.length} param{params.length !== 1 ? "s" : ""}</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {params.map((name) => <code key={name} className="rounded bg-muted px-1.5 py-0.5 text-[10px]">{name}</code>)}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Shared small components ────────────────────────────────────────

function TransformBadge({ mapping }: { mapping: ParameterMapping }) {
  if (!mapping.transform || mapping.transform === "direct") {
    if (mapping.source !== mapping.dest) {
      return <span className="inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">rename</span>;
    }
    return <span className="text-[10px] text-muted-foreground">direct</span>;
  }
  if (mapping.transform === "pluck") {
    return (
      <div className="space-y-1">
        <span className="inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-900/20 dark:text-amber-300">pluck</span>
        {mapping.description && <code className="block font-mono text-[10px] text-muted-foreground">{mapping.description}</code>}
      </div>
    );
  }
  if (mapping.transform === "mapObject") {
    return (
      <div className="space-y-1">
        <span className="inline-flex rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-medium text-purple-700 dark:bg-purple-900/20 dark:text-purple-300">mapObject</span>
        {mapping.fields && (
          <div className="flex flex-col gap-0.5">
            {Object.entries(mapping.fields).map(([src, dest]) => (
              <code key={src} className="font-mono text-[10px] text-muted-foreground">{src} → {dest}</code>
            ))}
          </div>
        )}
      </div>
    );
  }
  return null;
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border p-3 text-center">
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function ChevronIcon() {
  return (
    <svg className="h-4 w-4 shrink-0 text-muted-foreground transition-transform [[data-open]_&]:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

// ══════════════════════════════════════════════════════════════════
// MAIN
// ══════════════════════════════════════════════════════════════════

export function SpecViewer({ spec }: { spec: Spec }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{spec.project.name}</h1>
        <p className="text-muted-foreground">
          Measurement Spec v{spec.version}
          {spec.project.url && <> &middot; <span className="font-mono text-xs">{spec.project.url}</span></>}
        </p>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="parameters">Parameters</TabsTrigger>
          <TabsTrigger value="events">Events</TabsTrigger>
          <TabsTrigger value="mappings">Destination Mappings</TabsTrigger>
          <TabsTrigger value="implementation">Implementation</TabsTrigger>
        </TabsList>

        <TabsContent value="overview"><OverviewSection spec={spec} /></TabsContent>
        <TabsContent value="parameters"><ParametersSection spec={spec} /></TabsContent>
        <TabsContent value="events"><EventsSection spec={spec} /></TabsContent>
        <TabsContent value="mappings"><MappingsSection spec={spec} /></TabsContent>
        <TabsContent value="implementation"><ImplementationSection spec={spec} /></TabsContent>
      </Tabs>
    </div>
  );
}
