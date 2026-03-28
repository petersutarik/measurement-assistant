import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq, and } from "drizzle-orm";
import {
  destinations,
  destinationEvents,
  destinationParameters,
} from "../src/lib/db/schema/destinations";
import { GA4_EVENTS_CATALOG } from "../src/lib/ga4-events-catalog";

const connectionString = process.env.DATABASE_URL!;
if (!connectionString) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const client = postgres(connectionString);
const db = drizzle(client);

const GA4_DESTINATION = {
  name: "Google Analytics 4",
  slug: "ga4",
  scopeType: "system" as const,
  description:
    "Google Analytics 4 — Google's measurement platform for web and app analytics.",
  docsUrl:
    "https://developers.google.com/analytics/devguides/collection/ga4/reference/events",
  aiInstructions: `GA4 uses snake_case event names (e.g. add_to_cart, purchase, generate_lead).
Events should follow GA4 recommended event naming where possible — custom events use snake_case with no spaces.
Parameters also use snake_case. The "items" array parameter is used for all e-commerce events and contains item-level details (item_id, item_name, price, quantity, etc.).
Currency must be a 3-letter ISO 4217 code. When "value" is set, "currency" is required and vice versa.
transaction_id is required for purchase and refund events.`,
};

async function main() {
  let eventCount = 0;
  let paramCount = 0;

  await db.transaction(async (tx) => {
    // 1. Upsert GA4 destination
    const [dest] = await tx
      .insert(destinations)
      .values(GA4_DESTINATION)
      .onConflictDoUpdate({
        target: [destinations.slug, destinations.scopeType],
        set: {
          name: GA4_DESTINATION.name,
          description: GA4_DESTINATION.description,
          docsUrl: GA4_DESTINATION.docsUrl,
          aiInstructions: GA4_DESTINATION.aiInstructions,
        },
      })
      .returning({ id: destinations.id });

    const destinationId = dest.id;
    console.log(`GA4 destination: ${destinationId}`);

    // 2. Upsert events + parameters
    for (const catalogEvent of GA4_EVENTS_CATALOG) {
      const [event] = await tx
        .insert(destinationEvents)
        .values({
          destinationId,
          name: catalogEvent.name,
          description: catalogEvent.description,
          isStandard: true,
          category: catalogEvent.category,
          verticals: catalogEvent.verticals,
        })
        .onConflictDoUpdate({
          target: [destinationEvents.destinationId, destinationEvents.name],
          set: {
            description: catalogEvent.description,
            category: catalogEvent.category,
            verticals: catalogEvent.verticals,
          },
        })
        .returning({ id: destinationEvents.id });

      eventCount++;

      // Delete existing params for this event, then re-insert
      await tx
        .delete(destinationParameters)
        .where(eq(destinationParameters.destinationEventId, event.id));

      if (catalogEvent.parameters.length > 0) {
        await tx.insert(destinationParameters).values(
          catalogEvent.parameters.map((p) => ({
            destinationEventId: event.id,
            name: p.name,
            type: p.type === "items" ? "array" : p.type,
            description:
              p.type === "items"
                ? `${p.description} Each item contains: item_id, item_name, price, quantity, and other item-level fields.`
                : p.description,
            isRequired: p.required,
            isStandard: true,
            exampleValue:
              p.example !== undefined ? String(p.example) : undefined,
            scope: p.scope,
          })),
        );
        paramCount += catalogEvent.parameters.length;
      }
    }
  });

  console.log(`Seeded GA4: ${eventCount} events, ${paramCount} parameters`);
  await client.end();
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
