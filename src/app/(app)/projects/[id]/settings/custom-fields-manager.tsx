"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  createCustomFieldDefinition,
  deleteCustomFieldDefinition,
} from "./actions";
import type { CustomFieldDefinition } from "@/types";

const FIELD_TYPES = [
  { value: "text", label: "Text" },
  { value: "number", label: "Number" },
  { value: "boolean", label: "Checkbox" },
  { value: "select", label: "Single select" },
  { value: "multi_select", label: "Multi select" },
  { value: "date", label: "Date" },
] as const;

const ENTITY_TYPES = [
  { value: "event", label: "Events" },
  { value: "parameter", label: "Parameters" },
] as const;

interface CustomFieldsManagerProps {
  projectId: string;
  definitions: CustomFieldDefinition[];
}

export function CustomFieldsManager({
  projectId,
  definitions,
}: CustomFieldsManagerProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [fieldType, setFieldType] = useState("text");

  const showOptions = fieldType === "select" || fieldType === "multi_select";

  function handleCreate(formData: FormData) {
    startTransition(async () => {
      await createCustomFieldDefinition(projectId, formData);
      setOpen(false);
      setFieldType("text");
    });
  }

  function handleDelete(fieldId: string) {
    startTransition(async () => {
      await deleteCustomFieldDefinition(projectId, fieldId);
    });
  }

  const eventFields = definitions.filter((d) => d.entityType === "event");
  const paramFields = definitions.filter((d) => d.entityType === "parameter");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Custom Fields</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger
            render={
              <Button size="sm" nativeButton={false}>
                <Plus className="mr-2 size-4" />
                Add field
              </Button>
            }
          />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add custom field</DialogTitle>
            </DialogHeader>
            <form action={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" name="name" placeholder="e.g. Priority" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="entityType">Applies to</Label>
                <Select name="entityType" defaultValue="event">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ENTITY_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="fieldType">Type</Label>
                <Select
                  name="fieldType"
                  defaultValue="text"
                  onValueChange={(v: string | null) => { if (v) setFieldType(v); }}
                >
                  <SelectTrigger>
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
                <div className="space-y-2">
                  <Label htmlFor="options">Options (comma-separated)</Label>
                  <Input
                    id="options"
                    name="options"
                    placeholder="e.g. Low, Medium, High"
                  />
                </div>
              )}
              <Button type="submit" disabled={isPending} className="w-full">
                {isPending ? "Creating..." : "Create field"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {definitions.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">
          No custom fields yet. Add one to create custom columns in your tables.
        </p>
      ) : (
        <div className="space-y-6">
          {eventFields.length > 0 && (
            <FieldTable
              title="Event fields"
              fields={eventFields}
              onDelete={handleDelete}
              isPending={isPending}
            />
          )}
          {paramFields.length > 0 && (
            <FieldTable
              title="Parameter fields"
              fields={paramFields}
              onDelete={handleDelete}
              isPending={isPending}
            />
          )}
        </div>
      )}
    </div>
  );
}

function FieldTable({
  title,
  fields,
  onDelete,
  isPending,
}: {
  title: string;
  fields: CustomFieldDefinition[];
  onDelete: (id: string) => void;
  isPending: boolean;
}) {
  return (
    <div>
      <h3 className="text-sm font-medium text-muted-foreground mb-2">
        {title}
      </h3>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10" />
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Options</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {fields.map((field) => (
              <TableRow key={field.id}>
                <TableCell>
                  <GripVertical className="size-4 text-muted-foreground/50" />
                </TableCell>
                <TableCell className="font-medium">{field.name}</TableCell>
                <TableCell>
                  <Badge variant="secondary" className="text-xs">
                    {field.fieldType.replace("_", " ")}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {field.options
                    ? (field.options as string[]).join(", ")
                    : "—"}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={isPending}
                    onClick={() => onDelete(field.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
