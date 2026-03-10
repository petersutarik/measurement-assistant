"use client";

import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateParameterField } from "./actions";

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

const PARAM_TYPES = ["string", "number", "boolean", "array", "object"] as const;

export function ParamHoverCard({
  param,
  projectId,
  workspaceId,
  readOnly = false,
}: {
  param: EventParam;
  projectId: string;
  workspaceId: string;
  readOnly?: boolean;
}) {
  return (
    <Popover>
      <PopoverTrigger
        openOnHover
        delay={200}
        render={
          <Badge variant="outline" className="text-xs font-mono cursor-pointer">
            {param.name}
            <span className="ml-1 text-muted-foreground font-sans">
              {param.type}
            </span>
          </Badge>
        }
      />
      <PopoverContent side="top" sideOffset={8} className="w-80">
        <PopoverHeader>
          <PopoverTitle className="font-mono">{param.name}</PopoverTitle>
        </PopoverHeader>
        {readOnly ? (
          <ReadOnlyDetails param={param} />
        ) : (
          <EditableDetails
            param={param}
            projectId={projectId}
            workspaceId={workspaceId}
          />
        )}
      </PopoverContent>
    </Popover>
  );
}

function ReadOnlyDetails({ param }: { param: EventParam }) {
  return (
    <div className="space-y-2 text-sm">
      <DetailRow label="Type">
        <Badge variant="secondary" className="text-xs">
          {param.type}
        </Badge>
      </DetailRow>
      <DetailRow label="Required">
        {param.isRequired ? "Yes" : "No"}
      </DetailRow>
      {param.description && (
        <DetailRow label="Description">{param.description}</DetailRow>
      )}
      {param.exampleValue && (
        <DetailRow label="Example">
          <code className="text-xs bg-muted px-1 py-0.5 rounded">
            {param.exampleValue}
          </code>
        </DetailRow>
      )}
      {param.origin && (
        <DetailRow label="Origin">{param.origin}</DetailRow>
      )}
    </div>
  );
}

function EditableDetails({
  param,
  projectId,
  workspaceId,
}: {
  param: EventParam;
  projectId: string;
  workspaceId: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function saveField(
    field: "name" | "type" | "description" | "isRequired" | "exampleValue" | "origin",
    value: string | boolean
  ) {
    setError(null);
    startTransition(async () => {
      try {
        await updateParameterField(
          projectId,
          workspaceId,
          param.eventId,
          param.id,
          field,
          value
        );
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to save");
      }
    });
  }

  return (
    <div className={`space-y-3 text-sm ${isPending ? "opacity-60" : ""}`}>
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Name</Label>
        <Input
          defaultValue={param.name}
          className="h-7 text-sm font-mono"
          onBlur={(e) => {
            if (e.target.value.trim() !== param.name) {
              saveField("name", e.target.value.trim());
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          }}
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Type</Label>
        <Select
          defaultValue={param.type}
          onValueChange={(v: string | null) => { if (v) saveField("type", v); }}
        >
          <SelectTrigger className="h-7 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PARAM_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-2">
        <Checkbox
          id={`req-${param.id}`}
          defaultChecked={param.isRequired}
          onCheckedChange={(v: boolean) => saveField("isRequired", Boolean(v))}
        />
        <Label htmlFor={`req-${param.id}`} className="text-xs">
          Required
        </Label>
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Description</Label>
        <Input
          defaultValue={param.description ?? ""}
          placeholder="Parameter description..."
          className="h-7 text-sm"
          onBlur={(e) => {
            if (e.target.value !== (param.description ?? "")) {
              saveField("description", e.target.value);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          }}
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Example value</Label>
        <Input
          defaultValue={param.exampleValue ?? ""}
          placeholder="e.g. ABC123"
          className="h-7 text-sm font-mono"
          onBlur={(e) => {
            if (e.target.value !== (param.exampleValue ?? "")) {
              saveField("exampleValue", e.target.value);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          }}
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Origin</Label>
        <Input
          defaultValue={param.origin ?? ""}
          placeholder="e.g. GTM, CMS..."
          className="h-7 text-sm"
          onBlur={(e) => {
            if (e.target.value !== (param.origin ?? "")) {
              saveField("origin", e.target.value);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          }}
        />
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function DetailRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex justify-between items-start gap-4">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="text-right">{children}</span>
    </div>
  );
}
