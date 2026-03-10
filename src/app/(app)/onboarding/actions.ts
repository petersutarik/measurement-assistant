"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { users, accounts, organizations, accountMembers } from "@/lib/db/schema";
import { createAccountSchema } from "@/lib/validators/tenant";
import { slugify } from "@/lib/slugify";

export async function completeOnboarding(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    throw new Error("Not authenticated");
  }

  const accountName = formData.get("accountName") as string;
  const orgName = formData.get("orgName") as string;

  const accountSlug = slugify(accountName);
  const orgSlug = slugify(orgName);

  // Validate account
  createAccountSchema.parse({ name: accountName, slug: accountSlug });

  // Upsert app user
  await db
    .insert(users)
    .values({
      id: authUser.id,
      email: authUser.email!,
      name: (authUser.user_metadata?.name as string) ?? null,
      avatarUrl: (authUser.user_metadata?.avatar_url as string) ?? null,
    })
    .onConflictDoUpdate({
      target: users.id,
      set: {
        email: authUser.email!,
        name: (authUser.user_metadata?.name as string) ?? null,
        avatarUrl: (authUser.user_metadata?.avatar_url as string) ?? null,
      },
    });

  // Create account
  const [account] = await db
    .insert(accounts)
    .values({ name: accountName, slug: accountSlug })
    .returning();

  // Create account membership (owner)
  await db
    .insert(accountMembers)
    .values({
      accountId: account.id,
      userId: authUser.id,
      role: "owner",
    });

  // Create organization
  await db
    .insert(organizations)
    .values({
      accountId: account.id,
      name: orgName,
      slug: orgSlug,
    });

  redirect("/projects");
}
