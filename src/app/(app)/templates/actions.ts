"use server";

import { eq, or, isNull, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireUserContext } from "@/lib/auth/user-context";
import { db } from "@/lib/db";
import { planTemplates } from "@/lib/db/schema";

export async function getTemplates() {
  const ctx = await requireUserContext();
  return db
    .select()
    .from(planTemplates)
    .where(
      or(
        isNull(planTemplates.accountId),
        eq(planTemplates.accountId, ctx.account.id)
      )
    )
    .orderBy(planTemplates.name);
}

export async function createTemplate(
  name: string,
  description: string,
  document: string
) {
  const ctx = await requireUserContext();
  const [template] = await db
    .insert(planTemplates)
    .values({
      accountId: ctx.account.id,
      name,
      description,
      document,
    })
    .returning();
  revalidatePath("/templates");
  return template;
}

export async function updateTemplate(
  templateId: string,
  data: { name?: string; description?: string; document?: string }
) {
  const ctx = await requireUserContext();
  // Only allow editing account-owned templates (not system ones)
  await db
    .update(planTemplates)
    .set(data)
    .where(
      and(
        eq(planTemplates.id, templateId),
        eq(planTemplates.accountId, ctx.account.id)
      )
    );
  revalidatePath("/templates");
}

export async function deleteTemplate(templateId: string) {
  const ctx = await requireUserContext();
  // Only allow deleting account-owned templates
  await db
    .delete(planTemplates)
    .where(
      and(
        eq(planTemplates.id, templateId),
        eq(planTemplates.accountId, ctx.account.id)
      )
    );
  revalidatePath("/templates");
}
