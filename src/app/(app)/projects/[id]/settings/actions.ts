"use server";

import { revalidatePath } from "next/cache";
import { eq, and, max } from "drizzle-orm";
import { db } from "@/lib/db";
import { customFieldDefinitions } from "@/lib/db/schema";
import { projects } from "@/lib/db/schema";
import { requireUserContext } from "@/lib/auth/user-context";
import { createCustomFieldDefinitionSchema } from "@/lib/validators/custom-fields";

async function requireProject(projectId: string) {
  const { organization } = await requireUserContext();
  const [project] = await db
    .select()
    .from(projects)
    .where(
      and(eq(projects.id, projectId), eq(projects.organizationId, organization.id))
    )
    .limit(1);
  if (!project) throw new Error("Project not found");
  return { project, organization };
}

export async function getCustomFieldDefinitions(projectId: string) {
  const { project } = await requireProject(projectId);
  return db
    .select()
    .from(customFieldDefinitions)
    .where(
      and(
        eq(customFieldDefinitions.scopeType, "project"),
        eq(customFieldDefinitions.scopeId, project.id)
      )
    )
    .orderBy(customFieldDefinitions.sortOrder);
}

export async function createCustomFieldDefinition(
  projectId: string,
  formData: FormData
) {
  const { project } = await requireProject(projectId);

  const name = formData.get("name") as string;
  const entityType = formData.get("entityType") as string;
  const fieldType = formData.get("fieldType") as string;
  const optionsRaw = formData.get("options") as string;
  const options = optionsRaw
    ? optionsRaw.split(",").map((o) => o.trim()).filter(Boolean)
    : undefined;

  createCustomFieldDefinitionSchema.parse({ name, entityType, fieldType, options });

  const [maxSort] = await db
    .select({ max: max(customFieldDefinitions.sortOrder) })
    .from(customFieldDefinitions)
    .where(
      and(
        eq(customFieldDefinitions.scopeType, "project"),
        eq(customFieldDefinitions.scopeId, project.id)
      )
    );

  await db.insert(customFieldDefinitions).values({
    scopeType: "project",
    scopeId: project.id,
    entityType: entityType as "event" | "parameter",
    name,
    fieldType: fieldType as "text" | "number" | "select" | "multi_select" | "boolean" | "date",
    options: options && options.length > 0 ? options : null,
    sortOrder: (maxSort?.max ?? -1) + 1,
  });

  revalidatePath(`/projects/${projectId}`);
}

export async function updateCustomFieldDefinition(
  projectId: string,
  fieldId: string,
  formData: FormData
) {
  await requireProject(projectId);

  const name = formData.get("name") as string;
  const optionsRaw = formData.get("options") as string;
  const options = optionsRaw
    ? optionsRaw.split(",").map((o) => o.trim()).filter(Boolean)
    : undefined;

  await db
    .update(customFieldDefinitions)
    .set({
      name: name || undefined,
      options: options && options.length > 0 ? options : null,
    })
    .where(eq(customFieldDefinitions.id, fieldId));

  revalidatePath(`/projects/${projectId}`);
}

export async function deleteCustomFieldDefinition(
  projectId: string,
  fieldId: string
) {
  await requireProject(projectId);
  await db
    .delete(customFieldDefinitions)
    .where(eq(customFieldDefinitions.id, fieldId));
  revalidatePath(`/projects/${projectId}`);
}

export async function reorderCustomFieldDefinitions(
  projectId: string,
  orderedIds: string[]
) {
  await requireProject(projectId);
  for (let i = 0; i < orderedIds.length; i++) {
    await db
      .update(customFieldDefinitions)
      .set({ sortOrder: i })
      .where(eq(customFieldDefinitions.id, orderedIds[i]));
  }
  revalidatePath(`/projects/${projectId}`);
}
