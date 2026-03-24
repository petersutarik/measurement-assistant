"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, X, Search } from "lucide-react";
import {
  createParameter,
  linkExistingParameter,
} from "./events/[eventId]/actions";

interface WorkspaceParam {
  id: string;
  name: string;
  type: string;
  description: string | null;
  isRequired: boolean;
  exampleValue: string | null;
  origin: string | null;
}

interface EventParam {
  id: string;
  name: string;
  type: string;
  isRequired: boolean;
  exampleValue: string | null;
  description: string | null;
  origin: string | null;
}

const PARAMETER_TYPES = [
  "string",
  "number",
  "boolean",
  "array",
  "object",
] as const;

export function AddParameterInput({
  projectId,
  workspaceId,
  eventId,
  existingParams,
  linkedParamIds,
  onAdded,
}: {
  projectId: string;
  workspaceId: string;
  eventId: string;
  existingParams: WorkspaceParam[];
  linkedParamIds: Set<string> | string[];
  onAdded?: () => void;
}) {
  const linkedSet = linkedParamIds instanceof Set ? linkedParamIds : new Set(linkedParamIds);
  const [query, setQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [showNewForm, setShowNewForm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // New parameter form state
  const [newType, setNewType] = useState<string>("string");
  const [newDescription, setNewDescription] = useState("");
  const [newIsRequired, setNewIsRequired] = useState(false);
  const [newExampleValue, setNewExampleValue] = useState("");
  const [newOrigin, setNewOrigin] = useState("");

  // Filter existing params that are not already linked
  const filteredParams = existingParams.filter(
    (p) =>
      !linkedSet.has(p.id) &&
      p.name.toLowerCase().includes(query.toLowerCase())
  );

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleSelectExisting(param: WorkspaceParam) {
    startTransition(async () => {
      await linkExistingParameter(projectId, workspaceId, eventId, param.id);
      setQuery("");
      setShowDropdown(false);
      onAdded?.();
    });
  }

  function handleCreateNew() {
    if (!query.trim()) return;
    startTransition(async () => {
      const formData = new FormData();
      formData.set("name", query.trim());
      formData.set("type", newType);
      if (newDescription) formData.set("description", newDescription);
      formData.set("isRequired", String(newIsRequired));
      if (newExampleValue) formData.set("exampleValue", newExampleValue);
      if (newOrigin) formData.set("origin", newOrigin);
      await createParameter(projectId, workspaceId, eventId, formData);
      resetNewForm();
      onAdded?.();
    });
  }

  function resetNewForm() {
    setQuery("");
    setShowNewForm(false);
    setNewType("string");
    setNewDescription("");
    setNewIsRequired(false);
    setNewExampleValue("");
    setNewOrigin("");
    setShowDropdown(false);
  }

  const exactMatch = existingParams.find(
    (p) => p.name.toLowerCase() === query.toLowerCase()
  );
  const showCreateOption = query.trim() && !exactMatch;

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShowDropdown(true);
              setShowNewForm(false);
            }}
            onFocus={() => setShowDropdown(true)}
            placeholder="Search existing or type new parameter name..."
            className="pl-8 h-8 text-sm"
            disabled={isPending}
          />
        </div>
      </div>

      {showDropdown && (query || filteredParams.length > 0) && !showNewForm && (
        <div
          ref={dropdownRef}
          className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md max-h-60 overflow-y-auto"
        >
          {filteredParams.map((param) => (
            <button
              key={param.id}
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent text-left"
              onClick={() => handleSelectExisting(param)}
              disabled={isPending}
            >
              <span className="font-medium font-mono">{param.name}</span>
              <Badge variant="outline" className="text-xs">
                {param.type}
              </Badge>
              {param.description && (
                <span className="text-muted-foreground truncate text-xs">
                  {param.description}
                </span>
              )}
            </button>
          ))}
          {showCreateOption && (
            <>
              {filteredParams.length > 0 && (
                <div className="border-t" />
              )}
              <button
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent text-left text-primary"
                onClick={() => {
                  setShowNewForm(true);
                  setShowDropdown(false);
                }}
                disabled={isPending}
              >
                <Plus className="size-3.5" />
                Create &quot;{query.trim()}&quot; as new parameter
              </button>
            </>
          )}
          {!showCreateOption && filteredParams.length === 0 && (
            <div className="px-3 py-2 text-sm text-muted-foreground">
              No matching parameters
            </div>
          )}
        </div>
      )}

      {showNewForm && (
        <div className="mt-3 rounded-md border p-3 space-y-3 bg-muted/30">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">
              New parameter: <span className="font-mono">{query.trim()}</span>
            </p>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-6"
              onClick={resetNewForm}
            >
              <X className="size-3.5" />
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Type</Label>
              <Select value={newType} onValueChange={(v) => v && setNewType(v)}>
                <SelectTrigger className="h-8">
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
            <div className="space-y-1">
              <Label className="text-xs">Example Value</Label>
              <Input
                className="h-8 text-sm"
                value={newExampleValue}
                onChange={(e) => setNewExampleValue(e.target.value)}
                placeholder='"ABC123"'
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Description</Label>
            <Textarea
              className="text-sm min-h-[60px]"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="What does this parameter represent?"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Origin</Label>
              <Input
                className="h-8 text-sm"
                value={newOrigin}
                onChange={(e) => setNewOrigin(e.target.value)}
                placeholder="e.g. CMS, URL"
              />
            </div>
            <div className="flex items-end pb-1">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="new-param-required"
                  checked={newIsRequired}
                  onCheckedChange={(c) => setNewIsRequired(c === true)}
                />
                <Label htmlFor="new-param-required" className="text-xs font-normal">
                  Required
                </Label>
              </div>
            </div>
          </div>
          <div className="flex justify-end">
            <Button
              type="button"
              size="sm"
              onClick={handleCreateNew}
              disabled={isPending || !query.trim()}
            >
              <Plus className="mr-1 size-3.5" />
              {isPending ? "Adding..." : "Add parameter"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
