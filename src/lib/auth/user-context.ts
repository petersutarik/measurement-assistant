import "server-only";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import {
  users,
  accounts,
  organizations,
  accountMembers,
} from "@/lib/db/schema";
import type { User, Account, Organization, AccountMember } from "@/types";

export interface UserContext {
  user: User;
  account: Account;
  organization: Organization;
  membership: AccountMember;
}

export async function getUserContext(): Promise<UserContext | null> {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) return null;

  // Find the app user row
  const [appUser] = await db
    .select()
    .from(users)
    .where(eq(users.id, authUser.id))
    .limit(1);

  if (!appUser) return null;

  // Find the user's account membership
  const [membership] = await db
    .select()
    .from(accountMembers)
    .where(eq(accountMembers.userId, appUser.id))
    .limit(1);

  if (!membership) return null;

  // Get the account
  const [account] = await db
    .select()
    .from(accounts)
    .where(eq(accounts.id, membership.accountId))
    .limit(1);

  if (!account) return null;

  // Get the first organization for this account
  const [organization] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.accountId, account.id))
    .limit(1);

  if (!organization) return null;

  return { user: appUser, account, organization, membership };
}

export async function requireUserContext(): Promise<UserContext> {
  const context = await getUserContext();
  if (!context) {
    redirect("/onboarding");
  }
  return context;
}
