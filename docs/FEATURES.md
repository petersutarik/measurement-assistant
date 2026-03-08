# Features

## Authentication

- Email/password signup and login via Supabase Auth
- Session refresh via middleware
- Protected app routes (redirect to `/login` if unauthenticated)

## Onboarding

- Two-step wizard for new users (no account yet)
- **Step 1: Workspace** — create a top-level account (billing entity) with auto-generated slug
- **Step 2: Organization** — create an organization (client/business unit) under the account
- Upserts the app user record, creates account membership with "owner" role
- Auto-redirects unauthenticated-but-logged-in users to `/onboarding`
- After completion, redirects to `/dashboard`

## Projects CRUD

- **List** — table view of all projects in the current organization, ordered by creation date
- **Create** — dialog with name (required, auto-slug), description (optional), URL (optional)
- **Edit** — dialog pre-filled with existing values
- **Delete** — confirmation dialog with destructive action
- Empty state with CTA when no projects exist
- All actions enforce organization ownership (no cross-tenant access)

## Workspaces (Spec Versions)

- Each project contains workspaces — working copies of measurement specs
- **List** — card grid on project detail page showing name, description, event count
- **Create** — dialog with name (required) and description (optional)
- **Edit** — dialog pre-filled with existing values
- **Delete** — confirmation dialog warning about cascade deletion of events/parameters
- Empty state with CTA when no workspaces exist
- Stats cards on project page show real workspace and event counts

## Publishing & Versioning

- **Publish** — snapshot a workspace as a numbered published version (v1, v2, ...)
- Clones all events and parameters (with nested parentId remapping) into an immutable published spec version
- Project page shows a "Live vN" badge with the latest published version and date
- **Fork from live** — new workspaces automatically clone the latest published version's events and parameters
- Workspace cards show "from vN" badge when forked from a published version
- Publish button available on workspace detail page with confirmation dialog

## Events

- Each workspace contains events representing dataLayer pushes
- **List** — table view on workspace detail page with name, trigger, category, parameter count
- **Create** — dialog with name (required), description, trigger, page pattern, category, implementation notes
- **Edit** — dialog pre-filled with existing values
- **Delete** — confirmation dialog warning about cascade deletion of parameters
- Auto-computed sort order for new events
- Breadcrumb navigation: Project / Workspace / Event

## Parameters

- Each event contains parameters describing the data payload
- **List** — recursive tree view on event detail page with type badges, required indicators
- **Create** — dialog with name, type (string/number/boolean/array/object), description, example value, origin, required flag
- **Edit** — dialog pre-filled with existing values
- **Delete** — confirmation dialog warning about child parameter deletion
- **Nested parameters** — object and array type parameters support "Add child" to create nested structures
- Inline action buttons (edit, delete, add child) appear on hover

## Conflict Detection

- **Lineage tracking** — events and parameters carry a `sourceEventId`/`sourceParameterId` that traces back to the original entity across clones, enabling O(1) matching across versions
- **Staleness badge** — workspace cards show an amber "behind vN" badge when the workspace was forked from an older published version than the current live version
- **Conflict summary banner** — workspace detail page shows an alert bar when the workspace is behind live, with:
  - Summary counts as colored pills (added in live, removed from live, changed in live, changed here, conflicts, new here)
  - Expandable event diff list showing each event's change type
  - Nested parameter diffs within each event, also expandable
- **Three-way diff** — compares the fork base, current workspace, and latest published version to classify each event/parameter as unchanged, added, removed, modified in one side, or conflicting (modified in both)
- Display only — no merge or resolution actions yet

## Version History

- **List** — all published spec versions displayed on the project detail page, ordered by version number (newest first)
- Each version row shows: version badge (v1, v2...), name, description, published date, edit button, link to docs
- **Edit** — dialog to update a published version's name and description
- Section only appears when at least one published version exists

## Published Documentation

- **Sidebar** — "Documentation" appears as a collapsible menu in the sidebar when a project is selected, with two sub-links: Events and Parameters
- **Events page** (`/projects/[id]/published/events`) — read-only events table showing the latest published spec version
- **Parameters page** (`/projects/[id]/published/parameters`) — read-only parameters table showing all parameters grouped by identity, with an "Events" column listing which events use each parameter
- **Shared layout** — breadcrumb, version badge, and published-at date are shared across sub-pages
- `/projects/[id]/published` redirects to the Events sub-page
- Empty state shown when no published version exists

## Dashboard

- Welcome message with user's first name
- Stats cards: Projects (real count), Workspaces, Destinations (placeholder), Events (real count)
- **Projects table** — full CRUD table (create, edit, delete) for all projects in the organization, with name, URL, creation date, and action buttons
- Empty state with CTA when no projects exist
