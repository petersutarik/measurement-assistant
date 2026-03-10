"use client";

import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { CustomFieldDefinition } from "@/types";

interface CustomFieldCellProps {
  definition: CustomFieldDefinition;
  value: unknown;
  onSave: (definitionId: string, value: unknown) => Promise<void>;
  readOnly?: boolean;
}

export function CustomFieldCell({
  definition,
  value,
  onSave,
  readOnly = false,
}: CustomFieldCellProps) {
  const [isPending, startTransition] = useTransition();

  function save(newValue: unknown) {
    startTransition(async () => {
      await onSave(definition.id, newValue);
    });
  }

  if (readOnly) {
    return <ReadOnlyValue definition={definition} value={value} />;
  }

  return (
    <div className={isPending ? "opacity-60" : ""}>
      <EditableValue definition={definition} value={value} onSave={save} />
    </div>
  );
}

function ReadOnlyValue({
  definition,
  value,
}: {
  definition: CustomFieldDefinition;
  value: unknown;
}) {
  if (value == null || value === "") {
    return <span className="text-muted-foreground">—</span>;
  }

  switch (definition.fieldType) {
    case "boolean":
      return <span className="text-sm">{value ? "Yes" : "No"}</span>;
    case "select":
      return (
        <Badge variant="secondary" className="text-xs">
          {String(value)}
        </Badge>
      );
    case "multi_select":
      return (
        <div className="flex flex-wrap gap-1">
          {(value as string[]).map((v) => (
            <Badge key={v} variant="secondary" className="text-xs">
              {v}
            </Badge>
          ))}
        </div>
      );
    case "date":
      return <span className="text-sm text-muted-foreground">{String(value)}</span>;
    default:
      return <span className="text-sm">{String(value)}</span>;
  }
}

function EditableValue({
  definition,
  value,
  onSave,
}: {
  definition: CustomFieldDefinition;
  value: unknown;
  onSave: (value: unknown) => void;
}) {
  const options = (definition.options as string[] | null) ?? [];

  switch (definition.fieldType) {
    case "text":
      return (
        <Input
          defaultValue={(value as string) ?? ""}
          className="h-7 text-sm"
          onBlur={(e) => {
            if (e.target.value !== ((value as string) ?? "")) {
              onSave(e.target.value || null);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          }}
        />
      );

    case "number":
      return (
        <Input
          type="number"
          defaultValue={value != null ? String(value) : ""}
          className="h-7 text-sm w-24"
          onBlur={(e) => {
            const num = e.target.value ? Number(e.target.value) : null;
            if (num !== (value ?? null)) {
              onSave(num);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          }}
        />
      );

    case "boolean":
      return (
        <Checkbox
          defaultChecked={Boolean(value)}
          onCheckedChange={(checked: boolean) => onSave(Boolean(checked))}
        />
      );

    case "select":
      return (
        <Select
          defaultValue={(value as string) ?? ""}
          onValueChange={(v: string | null) => onSave(v || null)}
        >
          <SelectTrigger className="h-7 text-sm w-32">
            <SelectValue placeholder="—" />
          </SelectTrigger>
          <SelectContent>
            {options.map((opt) => (
              <SelectItem key={opt} value={opt}>
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );

    case "multi_select":
      return <MultiSelectCell value={value} options={options} onSave={onSave} />;

    case "date":
      return (
        <Input
          type="date"
          defaultValue={(value as string) ?? ""}
          className="h-7 text-sm w-36"
          onBlur={(e) => {
            if (e.target.value !== ((value as string) ?? "")) {
              onSave(e.target.value || null);
            }
          }}
        />
      );

    default:
      return <span className="text-muted-foreground">—</span>;
  }
}

function MultiSelectCell({
  value,
  options,
  onSave,
}: {
  value: unknown;
  options: string[];
  onSave: (value: unknown) => void;
}) {
  const selected = new Set<string>((value as string[] | null) ?? []);
  const [open, setOpen] = useState(false);

  function toggle(opt: string) {
    const next = new Set(selected);
    if (next.has(opt)) {
      next.delete(opt);
    } else {
      next.add(opt);
    }
    const arr = Array.from(next);
    onSave(arr.length > 0 ? arr : null);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button
            type="button"
            className="flex flex-wrap gap-1 min-h-[28px] items-center text-sm"
          >
            {selected.size > 0 ? (
              Array.from(selected).map((v) => (
                <Badge key={v} variant="secondary" className="text-xs">
                  {v}
                </Badge>
              ))
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </button>
        }
      />
      <PopoverContent className="w-48 p-2">
        <div className="space-y-1">
          {options.map((opt) => (
            <label
              key={opt}
              className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted rounded px-1 py-0.5"
            >
              <Checkbox
                checked={selected.has(opt)}
                onCheckedChange={() => toggle(opt)}
              />
              {opt}
            </label>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
