import { notFound } from "next/navigation";
import Link from "next/link";
import { eq, and } from "drizzle-orm";
import { requireUserContext } from "@/lib/auth/user-context";
import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { Badge } from "@/components/ui/badge";
import { getPublishedByVersionNumber, getLatestPublished } from "../../actions";

export default async function VersionLayout({
  params,
  children,
}: {
  params: Promise<{ id: string; versionNumber: string }>;
  children: React.ReactNode;
}) {
  const { id: projectId, versionNumber: versionParam } = await params;
  const versionNumber = parseInt(versionParam, 10);
  if (isNaN(versionNumber)) notFound();

  const { organization } = await requireUserContext();

  const [project] = await db
    .select()
    .from(projects)
    .where(
      and(eq(projects.id, projectId), eq(projects.organizationId, organization.id))
    )
    .limit(1);
  if (!project) notFound();

  const [version, latest] = await Promise.all([
    getPublishedByVersionNumber(projectId, versionNumber),
    getLatestPublished(projectId),
  ]);

  if (!version) notFound();

  const isLatest = latest?.id === version.id;

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
          <Link href={`/projects/${projectId}`} className="hover:underline">
            {project.name}
          </Link>
          <span>/</span>
          <span>Version History</span>
        </div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">
            {version.name ?? `v${version.versionNumber}`}
          </h1>
          <Badge variant="secondary">v{version.versionNumber}</Badge>
          {isLatest ? (
            <Badge className="bg-green-600 text-white hover:bg-green-700">
              Live
            </Badge>
          ) : (
            <Badge variant="outline" className="text-muted-foreground">
              Historical
            </Badge>
          )}
        </div>
        {version.description && (
          <p className="text-muted-foreground mt-1">
            {version.description}
          </p>
        )}
        {version.publishedAt && (
          <p className="text-xs text-muted-foreground mt-1">
            Published {version.publishedAt.toLocaleDateString()}
          </p>
        )}
      </div>

      {children}
    </div>
  );
}
