"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TableHead } from "@/components/ui/table";

const FIELD_TYPES = [
  { value: "text", label: "Text" },
  { value: "number", label: "Number" },
  { value: "boolean", label: "Checkbox" },
  { value: "select", label: "Single select" },
  { value: "multi_select", label: "Multi select" },
  { value: "date", label: "Date" },
] as const;

interface AddColumnButtonProps {
  onAdd: (formData: FormData) => Promise<void>;
  entityType: "event" | "parameter";
}

export function AddColumnButton({ onAdd, entityType }: AddColumnButtonProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [fieldType, setFieldType] = useState("text");

  const showOptions = fieldType === "select" || fieldType === "multi_select";

  function handleSubmit(formData: FormData) {
    formData.set("entityType", entityType);
    startTransition(async () => {
      await onAdd(formData);
      setOpen(false);
      setFieldType("text");
    });
  }

  return (
    <TableHead className="w-10 p-0">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <button
              type="button"
              className="flex items-center justify-center w-full h-full p-2 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
            >
              <Plus className="size-4" />
            </button>
          }
        />
        <PopoverContent align="end" className="w-64">
          <form action={handleSubmit} className="space-y-3">
            <p className="text-sm font-medium">Add column</p>
            <div className="space-y-1.5">
              <Label htmlFor="cf-name" className="text-xs">
                Name
              </Label>
              <Input
                id="cf-name"
                name="name"
                placeholder="e.g. Priority"
                className="h-8 text-sm"
                required
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cf-type" className="text-xs">
                Type
              </Label>
              <Select
                name="fieldType"
                defaultValue="text"
                onValueChange={(v: string | null) => {
                  if (v) setFieldType(v);
                }}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FIELD_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {showOptions && (
              <div className="space-y-1.5">
                <Label htmlFor="cf-options" className="text-xs">
                  Options (comma-separated)
                </Label>
                <Input
                  id="cf-options"
                  name="options"
                  placeholder="e.g. Low, Medium, High"
                  className="h-8 text-sm"
                />
              </div>
            )}
            <Button
              type="submit"
              size="sm"
              disabled={isPending}
              className="w-full"
            >
              {isPending ? "Adding..." : "Add column"}
            </Button>
          </form>
        </PopoverContent>
      </Popover>
    </TableHead>
  );
}
