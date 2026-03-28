---
name: deploy-gtm
description: Deploy measurement spec destination mappings to Google Tag Manager. Creates workspace, variables, triggers, and tags (GA4 + Meta CAPI via Stape template).
---

# Deploy to GTM

Deploy the current project's destination mappings to a Google Tag Manager container.

## Arguments

$ARGUMENTS — project slug, optionally followed by `--account-id X --container-id Y`

## Prerequisites

1. GTM CLI must be authenticated: `gtm auth login`
2. Project must have destinations (GA4/Meta) with event mappings configured
3. Project destination configs must include `measurementId` (GA4) and/or `pixelId` (Meta)

## Steps

1. Parse arguments to extract project slug and optional account/container IDs
2. Run the deploy orchestrator from `src/lib/gtm/deploy.ts`
3. Report results

## Execution

```typescript
import { deployToGtm } from "@/lib/gtm/deploy";

// Parse args
const args = "$ARGUMENTS".trim().split(/\s+/);
const projectSlug = args[0];
let accountId: string | undefined;
let containerId: string | undefined;

for (let i = 1; i < args.length; i++) {
  if (args[i] === "--account-id" && args[i + 1]) {
    accountId = args[++i];
  } else if (args[i] === "--container-id" && args[i + 1]) {
    containerId = args[++i];
  }
}

if (!projectSlug) {
  throw new Error("Usage: /deploy-gtm <project-slug> [--account-id X --container-id Y]");
}

const result = await deployToGtm({
  projectSlug,
  accountId,
  containerId,
  onProgress: console.log,
});
```

## What This Does

Given a project with configured destination mappings, this skill:

1. **Checks GTM auth** — ensures `gtm auth login` has been run
2. **Loads project data** — fetches all destination mappings from the local database
3. **Selects GTM container** — uses provided IDs or defaults to first available
4. **Creates a new GTM workspace** — named `[MA] {project} - {date}`
5. **For Meta destinations**: Uses AI to generate Custom JavaScript variables for complex parameter transformations (e.g. `items[]` → Meta `contents[]` format)
6. **Generates desired GTM state**:
   - `[MA] dlv - *` Data Layer Variables for each mapped parameter
   - `[MA] const - *` Constant variables for measurement/pixel IDs
   - `[MA] cjs - *` Custom JavaScript variables for transformations
   - `[MA] ce - *` Custom Event triggers for each spec event
   - `[MA] GA4 Config` tag (if not already present with same measurement ID)
   - `[MA] GA4 - *` Event tags per GA4 event mapping
   - `[MA] Meta - *` Tags per Meta event mapping (Stape CAPI template)
7. **Reconciles** with existing published `[MA]` resources — reuses matches, creates new
8. **Deploys** everything to the GTM workspace
9. **Reports** summary with link to the workspace

## Resource Naming

All created resources use the `[MA]` prefix so they can be identified and managed without touching user-created resources.

## Example

```bash
# Deploy with auto-detected container
/deploy-gtm my-ecommerce-site

# Deploy to specific container
/deploy-gtm my-ecommerce-site --account-id 6001234567 --container-id 12345678
```

## Important

This skill runs the deploy via **TypeScript code** that shells out to the `gtm` CLI. You should:

1. First check if the project exists and has mappings by querying the database
2. Run the deploy using the orchestrator in `src/lib/gtm/deploy.ts`
3. Since this is a skill prompt (not directly executable code), implement the deploy by:
   - Reading the project from DB using Drizzle
   - Calling the GTM CLI via the wrapper in `src/lib/gtm/cli.ts`
   - Following the flow in `src/lib/gtm/deploy.ts`

If the `deployToGtm` function can't be imported directly (since skills run as prompts), execute the equivalent steps using bash commands and the `gtm` CLI directly, reading the mapping data from the database first.
