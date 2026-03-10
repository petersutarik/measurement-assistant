import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";
import { timestamps } from "./_helpers";
import { accounts } from "./tenant";

export const apiKeys = pgTable("api_keys", {
  id: uuid("id").primaryKey().defaultRandom(),
  accountId: uuid("account_id")
    .notNull()
    .references(() => accounts.id, { onDelete: "cascade" }),
  name: text("name").notNull(), // e.g. "Claude Code - Peter's laptop"
  keyHash: text("key_hash").notNull().unique(), // SHA-256 hash of the key
  keyPrefix: text("key_prefix").notNull(), // first 8 chars for identification: "ma_live_..."
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  ...timestamps,
});
