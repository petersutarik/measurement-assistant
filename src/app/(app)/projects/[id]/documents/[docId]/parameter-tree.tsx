"use client";

import { useState } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Parameter {
  id: string;
  name: string;
  type: string;
  description: string | null;
  isRequired: boolean;
  exampleValue: string | null;
  origin: string | null;
  parentId: string | null;
}

function buildTree(params: Parameter[]) {
  const roots: (Parameter & { children: Parameter[] })[] = [];
  const childMap = new Map<string, Parameter[]>();

  for (const p of params) {
    if (p.parentId) {
      const existing = childMap.get(p.parentId);
      if (existing) existing.push(p);
      else childMap.set(p.parentId, [p]);
    }
  }

  for (const p of params) {
    if (!p.parentId) {
      roots.push({
        ...p,
        children: childMap.get(p.id)?.map((c) => ({ ...c, children: [] })) ?? [],
      });
    }
  }

  return roots;
}

function ParamRow({
  param,
  children,
  depth = 0,
}: {
  param: Parameter;
  children?: Parameter[];
  depth?: number;
}) {
  const [open, setOpen] = useState(false);
  const hasChildren = children && children.length > 0;

  return (
    <div>
      <div
        className="flex items-center gap-2 py-1 text-sm"
        style={{ paddingLeft: `${depth * 16}px` }}
      >
        {hasChildren ? (
          <button
            onClick={() => setOpen(!open)}
            className="shrink-0 text-muted-foreground hover:text-foreground"
          >
            {open ? (
              <ChevronDown className="size-3.5" />
            ) : (
              <ChevronRight className="size-3.5" />
            )}
          </button>
        ) : (
          <span className="w-3.5 shrink-0" />
        )}
        <code className="font-mono text-xs font-medium">{param.name}</code>
        <Badge variant="outline" className="text-[10px] px-1 py-0">
          {param.type}
        </Badge>
        {param.isRequired && (
          <Badge variant="destructive" className="text-[10px] px-1 py-0">
            required
          </Badge>
        )}
        {param.exampleValue && (
          <span className="text-xs text-muted-foreground truncate">
            e.g. {param.exampleValue}
          </span>
        )}
      </div>
      {param.description && (
        <p
          className="text-xs text-muted-foreground pb-0.5"
          style={{ paddingLeft: `${depth * 16 + 22}px` }}
        >
          {param.description}
        </p>
      )}
      {open &&
        children?.map((child) => (
          <ParamRow key={child.id} param={child} depth={depth + 1} />
        ))}
    </div>
  );
}

export function ParameterTree({ parameters }: { parameters: Parameter[] }) {
  const tree = buildTree(parameters);

  return (
    <div className="space-y-0.5">
      {tree.map((node) => (
        <ParamRow
          key={node.id}
          param={node}
          children={node.children}
        />
      ))}
    </div>
  );
}
