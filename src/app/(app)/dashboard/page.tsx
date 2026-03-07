import { eq, count } from "drizzle-orm";
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
import { FolderKanban, FileCode, Send, Layers } from "lucide-react";

export default async function DashboardPage() {
  const { user, organization } = await requireUserContext();

  const name = user.name ?? user.email;
  const firstName = name.includes("@") ? name.split("@")[0] : name.split(" ")[0];

  const [projectCount] = await db
    .select({ count: count() })
    .from(projects)
    .where(eq(projects.organizationId, organization.id));

  const stats = [
    { label: "Projects", value: String(projectCount.count), icon: FolderKanban },
    { label: "Specs", value: "--", icon: FileCode },
    { label: "Destinations", value: "--", icon: Send },
    { label: "Events", value: "--", icon: Layers },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Welcome back, {firstName}
        </h1>
        <p className="text-muted-foreground mt-1">
          Here&apos;s an overview of your measurement workspace.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.label}
              </CardTitle>
              <stat.icon className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>
            Your latest measurement plan updates will appear here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground py-8 text-center">
            No activity yet. Create a project to get started.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
