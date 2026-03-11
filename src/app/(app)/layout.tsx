import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { eq, desc } from "drizzle-orm";
import { createClient } from "@/lib/supabase/server";
import { getUserContext } from "@/lib/auth/user-context";
import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { AssistantProvider } from "@/components/assistant/assistant-context";
import { AssistantPanel } from "@/components/assistant/assistant-panel";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Check if user has completed onboarding
  const headerList = await headers();
  const pathname = headerList.get("x-next-pathname") ?? "";
  const context = await getUserContext();

  if (!context && !pathname.startsWith("/onboarding")) {
    redirect("/onboarding");
  }

  const email = user.email ?? "";
  const name = (user.user_metadata?.name as string) ?? null;
  const avatarUrl = (user.user_metadata?.avatar_url as string) ?? null;

  // Fetch projects for the sidebar switcher
  const orgProjects = context
    ? await db
        .select({ id: projects.id, name: projects.name, url: projects.url })
        .from(projects)
        .where(eq(projects.organizationId, context.organization.id))
        .orderBy(desc(projects.createdAt))
    : [];

  return (
    <AssistantProvider>
      <SidebarProvider>
        <AppSidebar user={{ email, name, avatarUrl }} projects={orgProjects} />
        <SidebarInset>
          <main className="flex-1 px-6 py-6 lg:px-8">{children}</main>
        </SidebarInset>
      </SidebarProvider>
      <AssistantPanel />
    </AssistantProvider>
  );
}
