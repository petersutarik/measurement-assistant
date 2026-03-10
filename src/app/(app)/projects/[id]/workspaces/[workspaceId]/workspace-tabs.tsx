"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface WorkspaceTabsProps {
  projectId: string;
  workspaceId: string;
}

const tabs = [
  { id: "events", label: "Events" },
  { id: "parameters", label: "Parameters" },
] as const;

export function WorkspaceTabs({ projectId, workspaceId }: WorkspaceTabsProps) {
  const pathname = usePathname();
  const base = `/projects/${projectId}/workspaces/${workspaceId}`;

  function isActive(tabId: string) {
    if (tabId === "events") {
      // Active for /events and /events/[eventId]
      return pathname === base || pathname === `${base}/events` || pathname.startsWith(`${base}/events/`);
    }
    return pathname.startsWith(`${base}/${tabId}`);
  }

  return (
    <div className="border-b">
      <nav className="flex gap-4 -mb-px">
        {tabs.map((tab) => (
          <Link
            key={tab.id}
            href={`${base}/${tab.id}`}
            className={cn(
              "px-1 py-2 text-sm font-medium border-b-2 transition-colors",
              isActive(tab.id)
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
            )}
          >
            {tab.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
