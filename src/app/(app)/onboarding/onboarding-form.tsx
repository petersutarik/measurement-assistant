"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { slugify } from "@/lib/slugify";
import { completeOnboarding } from "./actions";

export function OnboardingForm() {
  const [step, setStep] = useState(1);
  const [accountName, setAccountName] = useState("");
  const [orgName, setOrgName] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.set("accountName", accountName);
        formData.set("orgName", orgName);
        await completeOnboarding(formData);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong");
      }
    });
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      {/* Step indicators */}
      <div className="flex items-center justify-center gap-2">
        <div
          className={`h-2 w-12 rounded-full ${step >= 1 ? "bg-primary" : "bg-muted"}`}
        />
        <div
          className={`h-2 w-12 rounded-full ${step >= 2 ? "bg-primary" : "bg-muted"}`}
        />
      </div>

      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Create your workspace</CardTitle>
            <CardDescription>
              A workspace is your top-level account for billing and team
              management.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="accountName">Workspace name</Label>
              <Input
                id="accountName"
                placeholder="My Company"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                autoFocus
              />
              {accountName && (
                <p className="text-xs text-muted-foreground">
                  Slug: {slugify(accountName) || "—"}
                </p>
              )}
            </div>
            <Button
              className="w-full"
              disabled={!accountName.trim()}
              onClick={() => setStep(2)}
            >
              Continue
            </Button>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Create an organization</CardTitle>
            <CardDescription>
              An organization represents a client or business unit. You can
              create more later.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="orgName">Organization name</Label>
              <Input
                id="orgName"
                placeholder="Acme Corp"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                autoFocus
              />
              {orgName && (
                <p className="text-xs text-muted-foreground">
                  Slug: {slugify(orgName) || "—"}
                </p>
              )}
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setStep(1)}
                disabled={isPending}
              >
                Back
              </Button>
              <Button
                className="flex-1"
                disabled={!orgName.trim() || isPending}
                onClick={handleSubmit}
              >
                {isPending ? "Setting up..." : "Get started"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
