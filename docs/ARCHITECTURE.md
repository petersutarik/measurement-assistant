# Architecture

## Overview

Next.js 15 App Router application with PostgreSQL (Supabase) backend, using Drizzle ORM for typed queries and Supabase client for auth.

## Tenant Hierarchy

```
Account (billing entity)
  └─ Organization (client / business unit)
       └─ Project (website, app, or measurement scope)
```

Users belong to accounts via `accountMembers` (role: owner/admin/member). Organizations and projects cascade under the account.

## Auth Flow

1. Supabase Auth handles signup/login (email/password)
2. Middleware (`src/middleware.ts`) refreshes the auth session on every request
3. App layout (`src/app/(app)/layout.tsx`) checks auth → redirects to `/login` if no session
4. `getUserContext()` resolves the tenant hierarchy (user → account → org)
5. If no context exists (new user), redirects to `/onboarding`

## Key Abstractions

### User Context (`src/lib/auth/user-context.ts`)

Server-only helper that resolves the authenticated user's full tenant context:
- `getUserContext()` — returns `{ user, account, organization, membership }` or `null`
- `requireUserContext()` — same but redirects to `/onboarding` if null

Used by all server actions and server components that need org-scoped data.

### Server Actions

Located alongside their pages (e.g., `src/app/(app)/projects/actions.ts`). All actions:
- Call `requireUserContext()` for auth + tenant resolution
- Validate input with Zod schemas from `src/lib/validators/`
- Use Drizzle ORM for database operations
- Call `revalidatePath()` to refresh affected routes

## Database Access

Two clients coexist:
- **Drizzle** (`src/lib/db/index.ts`) — typed queries, schema-driven
- **Supabase client** (`src/lib/supabase/server.ts`) — auth, realtime, storage

## Testing

- **Framework:** Vitest
- **Config:** `vitest.config.ts` with `@/` alias resolution
- **Pattern:** Unit tests co-located with source (`*.test.ts`)
- **Run:** `npm test` (single run), `npm run test:watch` (watch mode)
