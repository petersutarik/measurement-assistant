import { revalidatePath } from "next/cache";
import { eq, and, max, sql } from "drizzle-orm";
import { getUserContext } from "@/lib/auth/user-context";
import { db } from "@/lib/db";
import {
  projects,
  specVersions,
  events,
  parameters,
  eventParameters,
} from "@/lib/db/schema";

/** Verify workspace belongs to user's org */
async function requireWorkspace(orgId: string, projectId: string, workspaceId: string) {
  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.organizationId, orgId)))
    .limit(1);
  if (!project) throw new Error("Project not found");

  const [workspace] = await db
    .select()
    .from(specVersions)
    .where(
      and(
        eq(specVersions.id, workspaceId),
        eq(specVersions.projectId, projectId),
        eq(specVersions.type, "workspace")
      )
    )
    .limit(1);
  if (!workspace) throw new Error("Workspace not found");

  return { project, workspace };
}

function revalidate(projectId: string, workspaceId: string, eventId?: string) {
  if (eventId) {
    revalidatePath(`/projects/${projectId}/workspaces/${workspaceId}/events/${eventId}`);
  }
  revalidatePath(`/projects/${projectId}/workspaces/${workspaceId}`);
  revalidatePath(`/projects/${projectId}`);
}

type ToolCall =
  | { tool: "create_event"; projectId: string; workspaceId: string; name: string; description?: string; trigger?: string; category?: string; pagePattern?: string; implementationNotes?: string }
  | { tool: "update_event"; projectId: string; workspaceId: string; eventId: string; name?: string; description?: string; trigger?: string; category?: string; pagePattern?: string; implementationNotes?: string }
  | { tool: "delete_event"; projectId: string; workspaceId: string; eventId: string }
  | { tool: "create_parameter"; projectId: string; workspaceId: string; eventId: string; name: string; type: "string" | "number" | "boolean" | "array" | "object"; description?: string; isRequired?: boolean; exampleValue?: string }
  | { tool: "update_parameter"; projectId: string; workspaceId: string; eventId: string; parameterId: string; name?: string; type?: "string" | "number" | "boolean" | "array" | "object"; description?: string; isRequired?: boolean; exampleValue?: string }
  | { tool: "delete_parameter"; projectId: string; workspaceId: string; eventId: string; parameterId: string };

export async function POST(req: Request) {
  const ctx = await getUserContext();
  if (!ctx) return new Response("Unauthorized", { status: 401 });

  const body = (await req.json()) as ToolCall;
  const orgId = ctx.organization.id;

  try {
    switch (body.tool) {
      case "create_event": {
        await requireWorkspace(orgId, body.projectId, body.workspaceId);
        const [maxSort] = await db
          .select({ max: max(events.sortOrder) })
          .from(events)
          .where(eq(events.specVersionId, body.workspaceId));
        const sortOrder = (maxSort?.max ?? -1) + 1;

        const [created] = await db.insert(events).values({
          specVersionId: body.workspaceId,
          name: body.name,
          description: body.description ?? null,
          trigger: body.trigger ?? null,
          pagePattern: body.pagePattern ?? null,
          category: body.category ?? null,
          implementationNotes: body.implementationNotes ?? null,
          sortOrder,
        }).returning({ id: events.id, name: events.name });

        revalidate(body.projectId, body.workspaceId);
        return Response.json({ success: true, event: created });
      }

      case "update_event": {
        await requireWorkspace(orgId, body.projectId, body.workspaceId);
        const [existing] = await db
          .select()
          .from(events)
          .where(and(eq(events.id, body.eventId), eq(events.specVersionId, body.workspaceId)))
          .limit(1);
        if (!existing) return Response.json({ error: "Event not found" }, { status: 404 });

        const updates: Record<string, unknown> = {};
        if (body.name !== undefined) updates.name = body.name;
        if (body.description !== undefined) updates.description = body.description || null;
        if (body.trigger !== undefined) updates.trigger = body.trigger || null;
        if (body.category !== undefined) updates.category = body.category || null;
        if (body.pagePattern !== undefined) updates.pagePattern = body.pagePattern || null;
        if (body.implementationNotes !== undefined) updates.implementationNotes = body.implementationNotes || null;

        if (Object.keys(updates).length > 0) {
          await db.update(events).set(updates).where(eq(events.id, body.eventId));
        }

        revalidate(body.projectId, body.workspaceId);
        return Response.json({ success: true, eventId: body.eventId });
      }

      case "delete_event": {
        await requireWorkspace(orgId, body.projectId, body.workspaceId);
        const [existing] = await db
          .select()
          .from(events)
          .where(and(eq(events.id, body.eventId), eq(events.specVersionId, body.workspaceId)))
          .limit(1);
        if (!existing) return Response.json({ error: "Event not found" }, { status: 404 });

        await db.delete(events).where(eq(events.id, body.eventId));
        await db.execute(sql`
          DELETE FROM parameters p
          WHERE p.spec_version_id = ${body.workspaceId}
          AND NOT EXISTS (SELECT 1 FROM event_parameters ep WHERE ep.parameter_id = p.id)
        `);

        revalidate(body.projectId, body.workspaceId);
        return Response.json({ success: true, deleted: existing.name });
      }

      case "create_parameter": {
        await requireWorkspace(orgId, body.projectId, body.workspaceId);
        // Verify event exists
        const [event] = await db
          .select()
          .from(events)
          .where(and(eq(events.id, body.eventId), eq(events.specVersionId, body.workspaceId)))
          .limit(1);
        if (!event) return Response.json({ error: "Event not found" }, { status: 404 });

        const [maxSort] = await db
          .select({ max: max(eventParameters.sortOrder) })
          .from(eventParameters)
          .where(eq(eventParameters.eventId, body.eventId));
        const sortOrder = (maxSort?.max ?? -1) + 1;

        const [param] = await db.insert(parameters).values({
          specVersionId: body.workspaceId,
          name: body.name,
          type: body.type,
          description: body.description ?? null,
          isRequired: body.isRequired ?? false,
          exampleValue: body.exampleValue ?? null,
        }).returning({ id: parameters.id, name: parameters.name });

        await db.insert(eventParameters).values({
          eventId: body.eventId,
          parameterId: param.id,
          sortOrder,
        });

        revalidate(body.projectId, body.workspaceId, body.eventId);
        return Response.json({ success: true, parameter: param });
      }

      case "update_parameter": {
        await requireWorkspace(orgId, body.projectId, body.workspaceId);
        const [existing] = await db
          .select()
          .from(parameters)
          .where(and(eq(parameters.id, body.parameterId), eq(parameters.specVersionId, body.workspaceId)))
          .limit(1);
        if (!existing) return Response.json({ error: "Parameter not found" }, { status: 404 });

        const updates: Record<string, unknown> = {};
        if (body.name !== undefined) updates.name = body.name;
        if (body.type !== undefined) updates.type = body.type;
        if (body.description !== undefined) updates.description = body.description || null;
        if (body.isRequired !== undefined) updates.isRequired = body.isRequired;
        if (body.exampleValue !== undefined) updates.exampleValue = body.exampleValue || null;

        if (Object.keys(updates).length > 0) {
          await db.update(parameters).set(updates).where(eq(parameters.id, body.parameterId));
        }

        revalidate(body.projectId, body.workspaceId, body.eventId);
        return Response.json({ success: true, parameterId: body.parameterId });
      }

      case "delete_parameter": {
        await requireWorkspace(orgId, body.projectId, body.workspaceId);
        const [existing] = await db
          .select()
          .from(eventParameters)
          .where(
            and(
              eq(eventParameters.eventId, body.eventId),
              eq(eventParameters.parameterId, body.parameterId)
            )
          )
          .limit(1);
        if (!existing) return Response.json({ error: "Parameter not found" }, { status: 404 });

        await db.delete(eventParameters).where(
          and(
            eq(eventParameters.eventId, body.eventId),
            eq(eventParameters.parameterId, body.parameterId)
          )
        );
        await db.execute(sql`
          DELETE FROM parameters
          WHERE id = ${body.parameterId}
          AND NOT EXISTS (SELECT 1 FROM event_parameters ep WHERE ep.parameter_id = ${body.parameterId})
        `);

        revalidate(body.projectId, body.workspaceId, body.eventId);
        return Response.json({ success: true });
      }

      default:
        return Response.json({ error: "Unknown tool" }, { status: 400 });
    }
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 400 });
  }
}
