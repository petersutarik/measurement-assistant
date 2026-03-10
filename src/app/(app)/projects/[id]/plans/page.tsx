import { notFound } from "next/navigation";
import Link from "next/link";
import { eq, and } from "drizzle-orm";
import { requireUserContext } from "@/lib/auth/user-context";
import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, FileText } from "lucide-react";
import { getPlans } from "./actions";

export default async function PlansListPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { organization } = await requireUserContext();

  const [project] = await db
    .select()
    .from(projects)
    .where(
      and(eq(projects.id, id), eq(projects.organizationId, organization.id))
    )
    .limit(1);

  if (!project) notFound();

  const plans = await getPlans(id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Measurement Plans
          </h1>
          <p className="text-muted-foreground text-sm">
            AI-assisted measurement planning for {project.name}
          </p>
        </div>
        <Button render={<Link href={`/projects/${id}/plans/new`} />}>
          <Plus className="mr-2 size-4" />
          New Plan
        </Button>
      </div>

      {plans.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => (
            <Card key={plan.id} className="group relative">
              <Link
                href={`/projects/${id}/plans/${plan.id}`}
                className="absolute inset-0 z-10"
              />
              <CardHeader>
                <div className="flex items-center gap-2">
                  <FileText className="size-4 text-muted-foreground" />
                  <CardTitle className="text-base">{plan.title}</CardTitle>
                </div>
                <CardDescription>
                  <Badge variant="secondary" className="text-xs">
                    {plan.status}
                  </Badge>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Updated{" "}
                  {plan.updatedAt.toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="mx-auto size-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground mb-4">
              No measurement plans yet. Create one to start planning your
              tracking implementation with AI assistance.
            </p>
            <Button render={<Link href={`/projects/${id}/plans/new`} />}>
              <Plus className="mr-2 size-4" />
              New Plan
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
