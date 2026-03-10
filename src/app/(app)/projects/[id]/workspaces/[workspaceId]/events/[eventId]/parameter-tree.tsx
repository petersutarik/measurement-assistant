"use client";

import { Badge } from "@/components/ui/badge";
import { ParamTypeIcon } from "@/components/param-type-icon";
import { CreateParameterDialog } from "./create-parameter-dialog";
import { EditParameterDialog } from "./edit-parameter-dialog";
import { DeleteParameterDialog } from "./delete-parameter-dialog";
import type { Parameter } from "@/types";

interface TreeNode {
  parameter: Parameter;
  children: TreeNode[];
}

function buildTree(params: Parameter[]): TreeNode[] {
  const map = new Map<string, TreeNode>();
  const roots: TreeNode[] = [];

  for (const p of params) {
    map.set(p.id, { parameter: p, children: [] });
  }

  for (const p of params) {
    const node = map.get(p.id)!;
    if (p.parentId && map.has(p.parentId)) {
      map.get(p.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

function ParameterNode({
  node,
  depth,
  projectId,
  workspaceId,
  eventId,
}: {
  node: TreeNode;
  depth: number;
  projectId: string;
  workspaceId: string;
  eventId: string;
}) {
  const p = node.parameter;
  const canHaveChildren = p.type === "object" || p.type === "array";

  return (
    <div>
      <div
        className="flex items-center gap-2 py-2 px-3 rounded-md hover:bg-muted/50 group"
        style={{ paddingLeft: `${depth * 24 + 12}px` }}
      >
        <span className="font-mono text-sm font-medium">{p.name}</span>
        <Badge variant="outline" className="text-xs gap-1">
          <ParamTypeIcon type={p.type} className="size-3" />
          {p.type}
        </Badge>
        {p.isRequired && (
          <Badge variant="secondary" className="text-xs">
            required
          </Badge>
        )}
        {p.description && (
          <span className="text-xs text-muted-foreground truncate max-w-[300px]">
            {p.description}
          </span>
        )}
        {p.exampleValue && (
          <span className="text-xs text-muted-foreground font-mono">
            e.g. {p.exampleValue}
          </span>
        )}
        <div className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {canHaveChildren && (
            <CreateParameterDialog
              projectId={projectId}
              workspaceId={workspaceId}
              eventId={eventId}
              parentId={p.id}
            />
          )}
          <EditParameterDialog
            projectId={projectId}
            workspaceId={workspaceId}
            eventId={eventId}
            parameter={p}
          />
          <DeleteParameterDialog
            projectId={projectId}
            workspaceId={workspaceId}
            eventId={eventId}
            parameter={p}
            hasChildren={node.children.length > 0}
          />
        </div>
      </div>
      {node.children.map((child) => (
        <ParameterNode
          key={child.parameter.id}
          node={child}
          depth={depth + 1}
          projectId={projectId}
          workspaceId={workspaceId}
          eventId={eventId}
        />
      ))}
    </div>
  );
}

export function ParameterTree({
  parameters,
  projectId,
  workspaceId,
  eventId,
}: {
  parameters: Parameter[];
  projectId: string;
  workspaceId: string;
  eventId: string;
}) {
  const tree = buildTree(parameters);

  return (
    <div className="rounded-md border divide-y">
      {tree.map((node) => (
        <ParameterNode
          key={node.parameter.id}
          node={node}
          depth={0}
          projectId={projectId}
          workspaceId={workspaceId}
          eventId={eventId}
        />
      ))}
    </div>
  );
}
