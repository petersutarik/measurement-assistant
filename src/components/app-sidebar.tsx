"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  LayoutDashboard,
  FolderKanban,
  FileCode,
  Send,
  FileText,
  BookOpen,
  BrainCircuit,
  Settings,
  LogOut,
  ChevronDown,
  ChevronsUpDown,
  Plus,
  Check,
  LayoutTemplate,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { createClient } from "@/lib/supabase/client";
import { getProjectFaviconUrl, parseProjectUrl } from "@/lib/project-url";

interface SidebarProject {
  id: string;
  name: string;
  url: string | null;
}

interface AppSidebarProps {
  user: {
    email: string;
    name?: string | null;
    avatarUrl?: string | null;
  };
  projects: SidebarProject[];
}

const workspaceNav = [
  { href: "/specs", icon: FileCode, label: "Specs" },
  { href: "/destinations", icon: Send, label: "Destinations" },
] as const;

export function AppSidebar({ user, projects }: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  // Derive selected project from URL: /projects/[id]/...
  const projectIdFromUrl = pathname.match(/^\/projects\/([^/]+)/)?.[1] ?? null;
  const selectedProject =
    projects.find((p) => p.id === projectIdFromUrl) ?? null;
  const selectedProjectSite = parseProjectUrl(selectedProject?.url);

  const initials =
    user.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase() ?? user.email[0].toUpperCase();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <SidebarMenuButton
                    size="lg"
                    className="data-[popup-open]:bg-sidebar-accent data-[popup-open]:text-sidebar-accent-foreground"
                  />
                }
              >
                {selectedProjectSite ? (
                  <img
                    src={getProjectFaviconUrl(selectedProjectSite.hostname, 32)}
                    alt=""
                    width={32}
                    height={32}
                    className="size-8 shrink-0 rounded-lg"
                  />
                ) : (
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand text-brand-foreground">
                    <BarChart3 className="size-4" />
                  </div>
                )}
                <div className="grid flex-1 text-left leading-tight">
                  <span className="truncate text-sm font-semibold">
                    {selectedProjectSite?.hostname ??
                      selectedProject?.name ??
                      "Select project"}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {selectedProjectSite
                      ? selectedProject?.name
                      : "Measurement Assistant"}
                  </span>
                </div>
                <ChevronsUpDown className="ml-auto size-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="bottom"
                align="start"
                sideOffset={4}
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
              >
                {projects.map((project) => {
                  const projectSite = parseProjectUrl(project.url);

                  return (
                    <DropdownMenuItem
                      key={project.id}
                      onClick={() => router.push(`/projects/${project.id}`)}
                    >
                      {projectSite ? (
                        <img
                          src={getProjectFaviconUrl(projectSite.hostname, 32)}
                          alt=""
                          width={16}
                          height={16}
                          className="mr-2 size-4 shrink-0 rounded-sm"
                        />
                      ) : (
                        <FolderKanban className="mr-2 size-4 shrink-0" />
                      )}
                      <span className="truncate">
                        {projectSite?.hostname ?? project.name}
                      </span>
                      {project.id === selectedProject?.id && (
                        <Check className="ml-auto size-4 shrink-0" />
                      )}
                    </DropdownMenuItem>
                  );
                })}
                {projects.length > 0 && <DropdownMenuSeparator />}
                <DropdownMenuItem
                  onClick={() => router.push("/projects")}
                >
                  <Plus className="mr-2 size-4 shrink-0" />
                  <span>Manage projects</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {/* Dashboard */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  render={<Link href={selectedProject ? `/projects/${selectedProject.id}` : "/projects"} />}
                  isActive={!!selectedProject && pathname === `/projects/${selectedProject.id}`}
                  tooltip="Dashboard"
                >
                  <LayoutDashboard className="size-4" />
                  <span>Dashboard</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Workspace */}
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {workspaceNav.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    render={<Link href={item.href} />}
                    isActive={pathname.startsWith(item.href)}
                    tooltip={item.label}
                  >
                    <item.icon className="size-4" />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Project */}
        {selectedProject && (
          <SidebarGroup>
            <SidebarGroupLabel>Project</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    render={
                      <Link
                        href={`/projects/${selectedProject.id}/plans`}
                      />
                    }
                    isActive={pathname.startsWith(
                      `/projects/${selectedProject.id}/plans`
                    )}
                    tooltip="Plans"
                  >
                    <BrainCircuit className="size-4" />
                    <span>Plans</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    render={
                      <Link
                        href={`/projects/${selectedProject.id}/documents`}
                      />
                    }
                    isActive={pathname.startsWith(
                      `/projects/${selectedProject.id}/documents`
                    )}
                    tooltip="Documents"
                  >
                    <FileText className="size-4" />
                    <span>Documents</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <Collapsible
                  defaultOpen={pathname.startsWith(
                    `/projects/${selectedProject.id}/published`
                  )}
                  className="group/collapsible"
                >
                  <SidebarMenuItem>
                    <CollapsibleTrigger
                      render={<SidebarMenuButton tooltip="Documentation" />}
                    >
                      <BookOpen className="size-4" />
                      <span>Documentation</span>
                      <ChevronDown className="ml-auto size-4 transition-transform group-data-[panel-open]/collapsible:rotate-180" />
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton
                            render={
                              <Link
                                href={`/projects/${selectedProject.id}/published/events`}
                              />
                            }
                            isActive={
                              pathname === `/projects/${selectedProject.id}/published/events` ||
                              pathname.startsWith(`/projects/${selectedProject.id}/published/events/`)
                            }
                          >
                            Events
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton
                            render={
                              <Link
                                href={`/projects/${selectedProject.id}/published/parameters`}
                              />
                            }
                            isActive={
                              pathname === `/projects/${selectedProject.id}/published/parameters` ||
                              pathname.startsWith(`/projects/${selectedProject.id}/published/parameters/`)
                            }
                          >
                            Parameters
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    render={
                      <Link
                        href={`/projects/${selectedProject.id}/settings`}
                      />
                    }
                    isActive={pathname.startsWith(
                      `/projects/${selectedProject.id}/settings`
                    )}
                    tooltip="Project Settings"
                  >
                    <Settings className="size-4" />
                    <span>Settings</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* General */}
        <SidebarGroup>
          <SidebarGroupLabel>General</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  render={<Link href="/templates" />}
                  isActive={pathname.startsWith("/templates")}
                  tooltip="Templates"
                >
                  <LayoutTemplate className="size-4" />
                  <span>Templates</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  render={<Link href="/settings" />}
                  isActive={pathname.startsWith("/settings")}
                  tooltip="Settings"
                >
                  <Settings className="size-4" />
                  <span>Settings</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <SidebarMenuButton
                    size="lg"
                    className="data-[popup-open]:bg-sidebar-accent data-[popup-open]:text-sidebar-accent-foreground"
                  />
                }
              >
                <Avatar className="size-7 rounded-full">
                  <AvatarFallback className="rounded-full text-xs">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">
                    {user.name ?? user.email}
                  </span>
                  {user.name && (
                    <span className="truncate text-xs text-muted-foreground">
                      {user.email}
                    </span>
                  )}
                </div>
                <ChevronsUpDown className="ml-auto size-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="top"
                align="end"
                sideOffset={4}
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
              >
                <div className="flex items-center gap-2 px-2 py-2 text-left text-sm">
                  <Avatar className="size-8 rounded-full">
                    <AvatarFallback className="rounded-full">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">
                      {user.name ?? user.email}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {user.email}
                    </span>
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
