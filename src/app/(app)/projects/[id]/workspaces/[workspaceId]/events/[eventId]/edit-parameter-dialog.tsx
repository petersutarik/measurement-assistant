"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Pencil } from "lucide-react";
import { updateParameter } from "./actions";
import type { Parameter } from "@/types";

const PARAMETER_TYPES = ["string", "number", "boolean", "array", "object"] as const;

export function EditParameterDialog({
  projectId,
  workspaceId,
  eventId,
  parameter,
}: {
  projectId: string;
  workspaceId: string;
  eventId: string;
  parameter: Parameter;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState(parameter.name);
  const [type, setType] = useState(parameter.type);
  const [description, setDescription] = useState(parameter.description ?? "");
  const [isRequired, setIsRequired] = useState(parameter.isRequired);
  const [exampleValue, setExampleValue] = useState(
    parameter.exampleValue ?? ""
  );
  const [origin, setOrigin] = useState(parameter.origin ?? "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.set("name", name);
        formData.set("type", type);
        if (description) formData.set("description", description);
        formData.set("isRequired", String(isRequired));
        if (exampleValue) formData.set("exampleValue", exampleValue);
        if (origin) formData.set("origin", origin);
        await updateParameter(
          projectId,
          workspaceId,
          eventId,
          parameter.id,
          formData
        );
        setOpen(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="ghost" size="icon" className="size-7">
            <Pencil className="size-3" />
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit parameter</DialogTitle>
          <DialogDescription>Update parameter details.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="param-edit-name">Name</Label>
              <Input
                id="param-edit-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="param-edit-type">Type</Label>
              <Select value={type} onValueChange={(v) => v && setType(v)}>
                <SelectTrigger id="param-edit-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PARAMETER_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="param-edit-description">Description</Label>
            <Textarea
              id="param-edit-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="param-edit-example">Example Value</Label>
              <Input
                id="param-edit-example"
                value={exampleValue}
                onChange={(e) => setExampleValue(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="param-edit-origin">Origin</Label>
              <Input
                id="param-edit-origin"
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="param-edit-required"
              checked={isRequired}
              onCheckedChange={(checked) => setIsRequired(checked === true)}
            />
            <Label htmlFor="param-edit-required" className="font-normal">
              Required parameter
            </Label>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || isPending}>
              {isPending ? "Saving..." : "Save changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
