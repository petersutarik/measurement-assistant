"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Copy } from "lucide-react";
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

function exampleValueForType(
  type: string,
  exampleValue: string | null
): string {
  if (exampleValue) {
    // If it looks like a raw value, wrap strings in quotes
    if (type === "string" && !exampleValue.startsWith('"')) {
      return `"${exampleValue}"`;
    }
    return exampleValue;
  }
  switch (type) {
    case "string":
      return '"…"';
    case "number":
      return "0";
    case "boolean":
      return "true";
    case "array":
      return "[]";
    case "object":
      return "{}";
    default:
      return "null";
  }
}

function nodeToSnippet(node: TreeNode, indent: number): string {
  const pad = "  ".repeat(indent);
  const p = node.parameter;

  if (
    (p.type === "object" || p.type === "array") &&
    node.children.length > 0
  ) {
    if (p.type === "array") {
      // Array of objects
      const childLines = node.children
        .map((c) => nodeToSnippet(c, indent + 2))
        .join(",\n");
      return `${pad}${p.name}: [\n${pad}  {\n${childLines}\n${pad}  }\n${pad}]`;
    }
    // Object with children
    const childLines = node.children
      .map((c) => nodeToSnippet(c, indent + 1))
      .join(",\n");
    return `${pad}${p.name}: {\n${childLines}\n${pad}}`;
  }

  const val = exampleValueForType(p.type, p.exampleValue);
  return `${pad}${p.name}: ${val}`;
}

function generateSnippet(eventName: string, parameters: Parameter[]): string {
  const tree = buildTree(parameters);

  if (tree.length === 0) {
    return `window.dataLayer = window.dataLayer || [];\nwindow.dataLayer.push({\n  event: "${eventName}"\n});`;
  }

  const paramLines = tree.map((n) => nodeToSnippet(n, 1)).join(",\n");

  return `window.dataLayer = window.dataLayer || [];\nwindow.dataLayer.push({\n  event: "${eventName}",\n${paramLines}\n});`;
}

export function DataLayerSnippet({
  eventName,
  parameters,
}: {
  eventName: string;
  parameters: Parameter[];
}) {
  const [copied, setCopied] = useState(false);
  const snippet = generateSnippet(eventName, parameters);

  async function handleCopy() {
    await navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium">
          dataLayer.push() Example
        </CardTitle>
        <Button variant="ghost" size="icon" className="size-7" onClick={handleCopy}>
          {copied ? (
            <Check className="size-3 text-green-600" />
          ) : (
            <Copy className="size-3" />
          )}
        </Button>
      </CardHeader>
      <CardContent>
        <pre className="bg-muted rounded-md p-4 text-sm font-mono overflow-x-auto whitespace-pre">
          {snippet}
        </pre>
      </CardContent>
    </Card>
  );
}
