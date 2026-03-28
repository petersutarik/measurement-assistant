import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq } from "drizzle-orm";
import {
  destinations,
  destinationEvents,
  destinationParameters,
} from "../src/lib/db/schema/destinations";
import { META_EVENTS_CATALOG } from "../src/lib/meta-events-catalog";

const connectionString = process.env.DATABASE_URL!;
if (!connectionString) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const client = postgres(connectionString);
const db = drizzle(client);

const META_DESTINATION = {
  name: "Meta Pixel",
  slug: "meta-pixel",
  scopeType: "system" as const,
  description:
    "Meta (Facebook) Pixel — conversion tracking and audience building for Meta advertising platforms.",
  docsUrl: "https://developers.facebook.com/docs/meta-pixel/reference",
  aiInstructions: `Meta Pixel uses PascalCase event names (e.g. AddToCart, Purchase, Lead, ViewContent).
Standard events should be used where possible as they enable optimization features in Meta Ads.
Custom events use fbq('trackCustom', 'EventName', {params}).
Key parameters: content_ids (array), content_name, content_type, value, currency (ISO 4217).
The "contents" parameter is an array of objects with id, quantity, and item_price fields.
value + currency should always be sent together for revenue events.`,
};

async function main() {
  let eventCount = 0;
  let paramCount = 0;

  await db.transaction(async (tx) => {
    // 1. Upsert Meta destination
    const [dest] = await tx
      .insert(destinations)
      .values(META_DESTINATION)
      .onConflictDoUpdate({
        target: [destinations.slug, destinations.scopeType],
        set: {
          name: META_DESTINATION.name,
          description: META_DESTINATION.description,
          docsUrl: META_DESTINATION.docsUrl,
          aiInstructions: META_DESTINATION.aiInstructions,
        },
      })
      .returning({ id: destinations.id });

    const destinationId = dest.id;
    console.log(`Meta Pixel destination: ${destinationId}`);

    // 2. Upsert events + parameters
    for (const catalogEvent of META_EVENTS_CATALOG) {
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
            type: p.type === "object[]" ? "array" : p.type === "string[]" ? "array" : p.type,
            description: p.description,
            isRequired: p.required,
            isStandard: true,
            exampleValue:
              p.example !== undefined ? String(p.example) : undefined,
          })),
        );
        paramCount += catalogEvent.parameters.length;
      }
    }
  });

  console.log(`Seeded Meta Pixel: ${eventCount} events, ${paramCount} parameters`);
  await client.end();
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
