/**
 * Manual E2E test for GTM deploy.
 *
 * Usage: npx tsx scripts/test-gtm-deploy.ts
 *
 * Requires:
 * - Local Supabase running (supabase start)
 * - GTM CLI authenticated (gtm auth login)
 * - Project with destination mappings in local DB
 */

import { deployToGtm } from "../src/lib/gtm/deploy";

const PROJECT_SLUG = "peter-sutarik-personal-site";
const ACCOUNT_ID = "6000749441";
const CONTAINER_ID = "247356377";

async function main() {
  console.log("=== GTM Deploy E2E Test ===\n");

  try {
    const result = await deployToGtm({
      projectSlug: PROJECT_SLUG,
      accountId: ACCOUNT_ID,
      containerId: CONTAINER_ID,
      onProgress: (msg) => console.log(msg),
    });

    console.log("\n=== Results ===");
    console.log(`Workspace: ${result.workspace.name}`);
    console.log(`URL: ${result.workspace.url}`);
    console.log(
      `Summary: ${result.summary.created} created, ${result.summary.updated} updated, ${result.summary.reused} reused, ${result.summary.errors} errors`,
    );

    if (result.errors.length > 0) {
      console.log("\nErrors:");
      for (const err of result.errors) {
        console.log(`  ${err.type} "${err.name}": ${err.error}`);
      }
    }

    console.log("\nResources:");
    for (const r of result.resources) {
      console.log(`  ${r.action} ${r.type}: ${r.name} (${r.id})`);
    }
  } catch (err) {
    console.error("Deploy failed:", (err as Error).message);
    process.exit(1);
  }
}

main();
