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
import { Plus } from "lucide-react";
import { createParameter } from "./actions";

const PARAMETER_TYPES = ["string", "number", "boolean", "array", "object"] as const;

export function CreateParameterDialog({
  projectId,
  workspaceId,
  eventId,
  parentId,
  triggerLabel,
}: {
  projectId: string;
  workspaceId: string;
  eventId: string;
  parentId?: string;
  triggerLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [type, setType] = useState<string>("string");
  const [description, setDescription] = useState("");
  const [isRequired, setIsRequired] = useState(false);
  const [exampleValue, setExampleValue] = useState("");
  const [origin, setOrigin] = useState("");

  function resetForm() {
    setName("");
    setType("string");
    setDescription("");
    setIsRequired(false);
    setExampleValue("");
    setOrigin("");
  }

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
        if (parentId) formData.set("parentId", parentId);
        await createParameter(projectId, workspaceId, eventId, formData);
        setOpen(false);
        resetForm();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          parentId ? (
            <Button variant="ghost" size="sm">
              <Plus className="mr-1 size-3" />
              {triggerLabel ?? "Add child"}
            </Button>
          ) : (
            <Button>
              <Plus className="mr-2 size-4" />
              {triggerLabel ?? "Add Parameter"}
            </Button>
          )
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {parentId ? "Add child parameter" : "Add parameter"}
          </DialogTitle>
          <DialogDescription>
            {parentId
              ? "Add a nested parameter."
              : "Add a parameter to this event."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="param-create-name">Name</Label>
              <Input
                id="param-create-name"
                placeholder="e.g. transaction_id"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="param-create-type">Type</Label>
              <Select value={type} onValueChange={(v) => v && setType(v)}>
                <SelectTrigger id="param-create-type">
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
            <Label htmlFor="param-create-description">Description</Label>
            <Textarea
              id="param-create-description"
              placeholder="What does this parameter represent?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="param-create-example">Example Value</Label>
              <Input
                id="param-create-example"
                placeholder='e.g. "ABC123"'
                value={exampleValue}
                onChange={(e) => setExampleValue(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="param-create-origin">Origin</Label>
              <Input
                id="param-create-origin"
                placeholder="e.g. CMS, URL, cookie"
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="param-create-required"
              checked={isRequired}
              onCheckedChange={(checked) => setIsRequired(checked === true)}
            />
            <Label htmlFor="param-create-required" className="font-normal">
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
              {isPending ? "Adding..." : "Add parameter"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
