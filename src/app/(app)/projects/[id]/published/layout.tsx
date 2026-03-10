import { notFound } from "next/navigation";
import Link from "next/link";
import { eq, and } from "drizzle-orm";
import { requireUserContext } from "@/lib/auth/user-context";
import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Globe } from "lucide-react";
import { getLatestPublished } from "../actions";
import { PublishedTabs } from "./published-tabs";

export default async function PublishedLayout({
  params,
  children,
}: {
  params: Promise<{ id: string }>;
  children: React.ReactNode;
}) {
  const { id: projectId } = await params;
  const { organization } = await requireUserContext();

  const [project] = await db
    .select()
    .from(projects)
    .where(
      and(eq(projects.id, projectId), eq(projects.organizationId, organization.id))
    )
    .limit(1);
  if (!project) notFound();

  const published = await getLatestPublished(projectId);

  if (!published) {
    return (
      <div className="space-y-6">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Link href={`/projects/${projectId}`} className="hover:underline">
              {project.name}
            </Link>
            <span>/</span>
            <span>Documentation</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Documentation</h1>
        </div>
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-sm text-muted-foreground">
              No published version yet. Create a workspace and publish it to see the live documentation here.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
          <Link href={`/projects/${projectId}`} className="hover:underline">
            {project.name}
          </Link>
          <span>/</span>
          <span>Documentation</span>
        </div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">
            {published.name ?? `v${published.versionNumber}`}
          </h1>
          <Badge className="bg-green-600 text-white hover:bg-green-700">
            <Globe className="mr-1 size-3" />
            v{published.versionNumber}
          </Badge>
        </div>
        {published.description && (
          <p className="text-muted-foreground mt-1">
            {published.description}
          </p>
        )}
        {published.publishedAt && (
          <p className="text-xs text-muted-foreground mt-1">
            Published {published.publishedAt.toLocaleDateString()}
          </p>
        )}
      </div>

      <PublishedTabs projectId={projectId} />

      {children}
    </div>
  );
}
