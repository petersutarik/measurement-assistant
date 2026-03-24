"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { FileText, Loader2, Sparkles } from "lucide-react";
import { generateSpecFromPlan } from "./actions";

interface Plan {
  id: string;
  title: string;
  status: string;
}

export function GenerateFromPlan({
  projectId,
  workspaceId,
  plans,
}: {
  projectId: string;
  workspaceId?: string;
  plans: Plan[];
}) {
  const [selectedPlanId, setSelectedPlanId] = useState<string>(
    plans.length === 1 ? plans[0].id : ""
  );
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleGenerate() {
    if (!selectedPlanId) return;
    setError(null);
    startTransition(async () => {
      try {
        await generateSpecFromPlan(projectId, selectedPlanId, workspaceId);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to generate");
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        <FileText className="size-5" />
        <span className="text-sm">Generate events from a measurement plan</span>
      </div>
      <div className="flex items-center gap-3">
        <Select value={selectedPlanId} onValueChange={(v) => v && setSelectedPlanId(v)}>
          <SelectTrigger className="w-[300px]">
            <SelectValue placeholder="Select a measurement plan" />
          </SelectTrigger>
          <SelectContent>
            {plans.map((plan) => (
              <SelectItem key={plan.id} value={plan.id}>
                {plan.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          onClick={handleGenerate}
          disabled={!selectedPlanId || isPending}
        >
          {isPending ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 size-4" />
              Generate Events
            </>
          )}
        </Button>
      </div>
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  );
}
