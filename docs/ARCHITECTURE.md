# Architecture

## Overview

Next.js 15 App Router application with PostgreSQL (Supabase) backend, using Drizzle ORM for typed queries and Supabase client for auth.

## Tenant Hierarchy

```
Account (billing entity)
  └─ Organization (client / business unit)
       └─ Project (website, app, or measurement scope)
            └─ Workspace (SpecVersion with type=workspace)
                 └─ Event (dataLayer push)
                      └─ Parameter (self-referencing for nesting)
```

Users belong to accounts via `accountMembers` (role: owner/admin/member). Organizations and projects cascade under the account. Workspaces hold events and parameters that describe a measurement spec.

### Versioning

SpecVersions have two types: `workspace` (mutable working copy) and `published` (immutable snapshot). Publishing clones all events and parameters from a workspace into a new published version with an auto-incrementing `versionNumber`. New workspaces fork from the latest published version via `forkedFromId`, cloning its events and parameters as a starting point.

### Lineage Tracking

Events and parameters carry nullable `sourceEventId` / `sourceParameterId` columns that point to the root origin entity. When `cloneSpecData` copies events/parameters (during workspace creation or publishing), it sets `sourceEventId = evt.sourceEventId ?? evt.id` — carrying forward the root if it exists, or using the source event's own ID as root for the first clone. This gives all copies of the same original entity a shared lineage key for O(1) matching across versions. No FK constraint because source rows may live in different spec versions.

### Conflict Detection

A pure three-way diff function (`src/lib/conflicts/diff.ts`) compares three `VersionData` snapshots — the fork base, current workspace, and latest published version. Events are indexed by `sourceEventId` and parameters by `sourceParameterId`. For each unique key across all three sets, the function classifies the change as: `added_in_latest`, `removed_in_latest`, `modified_in_latest`, `modified_in_workspace`, `conflict` (both modified), `new_in_workspace`, or `unchanged`. Parameter diffs are nested under their parent event diffs. The server action `getWorkspaceConflicts` loads the three versions and returns a `ConflictSummary` with aggregate counts and detailed event/parameter diffs.

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

### Scope Verification Chain

Nested resources verify ownership up the chain before allowing mutations:
- **Workspace actions** — `requireProject(projectId)` verifies project belongs to user's org
- **Event actions** — `requireWorkspace(projectId, workspaceId)` verifies project → workspace chain
- **Parameter actions** — `requireEvent(projectId, workspaceId, eventId)` verifies full chain

## REST API (`src/app/api/v1/`)

API-first interface for AI agents and CLI tools. Uses Bearer token auth via API keys stored in `api_keys` table (SHA-256 hashed). Auth helper at `src/lib/api/auth.ts` resolves the account → organization context.

Key design decisions:
- API keys are scoped to accounts (not users), so agents operate at the billing entity level
- `specVersions.createdBy` is nullable to support API key auth (no user context)
- Shared `cloneSpecData` extracted to `src/lib/api/clone.ts` (used by both server actions and API routes)
- Bulk event endpoint (`/events/bulk`) allows creating up to 200 events with parameters in one call
- Response helpers in `src/lib/api/response.ts` for consistent JSON responses

## Route Structure

```
/projects                                           — project list
/projects/[id]                                      — project detail + workspaces
/projects/[id]/published                            — redirects to published/events
/projects/[id]/published/events                     — published events table
/projects/[id]/published/parameters                 — published parameters table
/projects/[id]/workspaces/[workspaceId]             — workspace detail + events table
/projects/[id]/workspaces/[workspaceId]/events/[eventId] — event detail + parameter tree

# API routes
/api/v1/projects                                    — list/create projects
/api/v1/projects/[projectId]                         — get/update/delete project
/api/v1/projects/[projectId]/published               — latest published spec
/api/v1/projects/[projectId]/workspaces              — list/create workspaces
/api/v1/projects/[projectId]/workspaces/[workspaceId]            — get/update/delete workspace
/api/v1/projects/[projectId]/workspaces/[workspaceId]/publish    — publish workspace
/api/v1/projects/[projectId]/workspaces/[workspaceId]/events     — list/create events
/api/v1/projects/[projectId]/workspaces/[workspaceId]/events/bulk — bulk create
/api/v1/projects/[projectId]/workspaces/[workspaceId]/events/[eventId]                    — CRUD
/api/v1/projects/[projectId]/workspaces/[workspaceId]/events/[eventId]/parameters          — list/create
/api/v1/projects/[projectId]/workspaces/[workspaceId]/events/[eventId]/parameters/[parameterId] — CRUD
/api/v1/api-keys                                     — create/list API keys
```

## Database Access

Two clients coexist:
- **Drizzle** (`src/lib/db/index.ts`) — typed queries, schema-driven
- **Supabase client** (`src/lib/supabase/server.ts`) — auth, realtime, storage

## Testing

- **Framework:** Vitest
- **Config:** `vitest.config.ts` with `@/` alias resolution
- **Pattern:** Unit tests co-located with source (`*.test.ts`)
- **Run:** `npm test` (single run), `npm run test:watch` (watch mode)
