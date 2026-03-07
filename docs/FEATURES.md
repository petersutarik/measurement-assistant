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

## Dashboard

- Welcome message with user's first name
- Stats cards: Projects (real count), Specs, Destinations, Events (placeholder)
- Recent activity feed (placeholder)
