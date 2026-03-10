import { eq, and, or, isNull, gt } from "drizzle-orm";
import { db } from "@/lib/db";
import { apiKeys } from "@/lib/db/schema/api-keys";
import { organizations } from "@/lib/db/schema";
import { NextResponse } from "next/server";

export interface ApiContext {
  accountId: string;
  defaultOrganizationId: string;
}

/** Hash an API key using SHA-256 */
export async function hashApiKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Generate a new API key: ma_live_<random> */
export function generateApiKey(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const random = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `ma_live_${random}`;
}

/**
 * Authenticate an API request via Bearer token.
 * Returns the account context or a 401 response.
 */
export async function requireApiAuth(
  request: Request
): Promise<ApiContext | NextResponse> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: "Missing or invalid Authorization header" },
      { status: 401 }
    );
  }

  const key = authHeader.slice(7);
  const keyHash = await hashApiKey(key);

  const [apiKey] = await db
    .select({
      id: apiKeys.id,
      accountId: apiKeys.accountId,
      expiresAt: apiKeys.expiresAt,
    })
    .from(apiKeys)
    .where(
      and(
        eq(apiKeys.keyHash, keyHash),
        or(isNull(apiKeys.expiresAt), gt(apiKeys.expiresAt, new Date()))
      )
    )
    .limit(1);

  if (!apiKey) {
    return NextResponse.json(
      { error: "Invalid or expired API key" },
      { status: 401 }
    );
  }

  // Update last used timestamp (fire and forget)
  db.update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.id, apiKey.id))
    .then(() => {});

  // Resolve a default organization for endpoints that create new projects
  // without an explicit organizationId.
  const [org] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.accountId, apiKey.accountId))
    .limit(1);

  if (!org) {
    return NextResponse.json(
      { error: "No organization found for this account" },
      { status: 403 }
    );
  }

  return {
    accountId: apiKey.accountId,
    defaultOrganizationId: org.id,
  };
}

/**
 * Helper: if requireApiAuth returned a Response, it's an error — return it.
 * Otherwise it's the context.
 */
export function isAuthError(
  result: ApiContext | NextResponse
): result is NextResponse {
  return result instanceof NextResponse;
}
