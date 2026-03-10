"use server";

import { revalidatePath } from "next/cache";
import { eq, and, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { createProjectSchema } from "@/lib/validators/tenant";
import { requireUserContext } from "@/lib/auth/user-context";
import { slugify } from "@/lib/slugify";
import type { Project } from "@/types";

export async function getProjects(): Promise<Project[]> {
  const { organization } = await requireUserContext();
  return db
    .select()
    .from(projects)
    .where(eq(projects.organizationId, organization.id))
    .orderBy(desc(projects.createdAt));
}

export async function createProject(formData: FormData) {
  const { organization } = await requireUserContext();

  const name = formData.get("name") as string;
  const description = (formData.get("description") as string) || undefined;
  const slug = slugify(name);

  const project = createProjectSchema.parse({
    organizationId: organization.id,
    name,
    slug,
    description,
    url: formData.get("url"),
  });

  await db.insert(projects).values({
    organizationId: project.organizationId,
    name: project.name,
    slug: project.slug,
    description: project.description ?? null,
    url: project.url,
  });

  revalidatePath("/projects");

}

export async function updateProject(id: string, formData: FormData) {
  const { organization } = await requireUserContext();

  const name = formData.get("name") as string;
  const description = (formData.get("description") as string) || undefined;
  const slug = slugify(name);
  const project = createProjectSchema.parse({
    organizationId: organization.id,
    name,
    slug,
    description,
    url: formData.get("url"),
  });

  // Ensure the project belongs to the user's org
  const [existing] = await db
    .select()
    .from(projects)
    .where(
      and(eq(projects.id, id), eq(projects.organizationId, organization.id))
    )
    .limit(1);

  if (!existing) {
    throw new Error("Project not found");
  }

  await db
    .update(projects)
    .set({
      name: project.name,
      slug: project.slug,
      description: project.description ?? null,
      url: project.url,
    })
    .where(eq(projects.id, id));

  revalidatePath("/projects");

}

export async function deleteProject(id: string) {
  const { organization } = await requireUserContext();

  // Ensure the project belongs to the user's org
  const [existing] = await db
    .select()
    .from(projects)
    .where(
      and(eq(projects.id, id), eq(projects.organizationId, organization.id))
    )
    .limit(1);

  if (!existing) {
    throw new Error("Project not found");
  }

  await db.delete(projects).where(eq(projects.id, id));

  revalidatePath("/projects");

}
