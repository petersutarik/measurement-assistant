import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { apiKeys } from "@/lib/db/schema/api-keys";
import { accountMembers } from "@/lib/db/schema";
import { createClient } from "@/lib/supabase/server";
import { generateApiKey, hashApiKey } from "@/lib/api/auth";
import { ok, created, validationError, serverError } from "@/lib/api/response";
import { NextResponse } from "next/server";
import { ZodError, z } from "zod";

const createKeySchema = z.object({
  name: z.string().min(1).max(100),
});

/**
 * POST /api/v1/api-keys
 *
 * Create a new API key. Requires Supabase session auth (cookie).
 * Returns the raw key ONCE — it cannot be retrieved again.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find user's account
    const [membership] = await db
      .select({ accountId: accountMembers.accountId })
      .from(accountMembers)
      .where(eq(accountMembers.userId, user.id))
      .limit(1);

    if (!membership) {
      return NextResponse.json(
        { error: "No account found" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validated = createKeySchema.parse(body);

    const rawKey = generateApiKey();
    const keyHash = await hashApiKey(rawKey);
    const keyPrefix = rawKey.slice(0, 12); // "ma_live_xxxx"

    const [apiKey] = await db
      .insert(apiKeys)
      .values({
        accountId: membership.accountId,
        name: validated.name,
        keyHash,
        keyPrefix,
      })
      .returning({
        id: apiKeys.id,
        name: apiKeys.name,
        keyPrefix: apiKeys.keyPrefix,
        createdAt: apiKeys.createdAt,
      });

    return created({
      ...apiKey,
      key: rawKey, // Only returned once!
    });
  } catch (error) {
    if (error instanceof ZodError) return validationError(error);
    return serverError(error);
  }
}

/**
 * GET /api/v1/api-keys
 *
 * List all API keys for the current user's account.
 * Requires Supabase session auth (cookie).
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [membership] = await db
      .select({ accountId: accountMembers.accountId })
      .from(accountMembers)
      .where(eq(accountMembers.userId, user.id))
      .limit(1);

    if (!membership) {
      return NextResponse.json(
        { error: "No account found" },
        { status: 403 }
      );
    }

    const keys = await db
      .select({
        id: apiKeys.id,
        name: apiKeys.name,
        keyPrefix: apiKeys.keyPrefix,
        lastUsedAt: apiKeys.lastUsedAt,
        createdAt: apiKeys.createdAt,
      })
      .from(apiKeys)
      .where(eq(apiKeys.accountId, membership.accountId));

    return ok(keys);
  } catch (error) {
    return serverError(error);
  }
}
