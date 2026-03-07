import { pgTable, uuid, text, integer } from "drizzle-orm/pg-core";
import { timestamps, createdAt } from "./_helpers";
import { users } from "./tenant";
import { events } from "./spec";

// Threaded comments — polymorphic (event, impl_document, qa_issue)
export const comments = pgTable("comments", {
  id: uuid("id").primaryKey().defaultRandom(),
  parentCommentId: uuid("parent_comment_id"), // self-ref for threading
  commentableType: text("commentable_type").notNull(), // event, impl_document, qa_issue
  commentableId: uuid("commentable_id").notNull(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  authorName: text("author_name"), // for anonymous (share link) commenters
  body: text("body").notNull(),
  anchorField: text("anchor_field"), // which field the selection is from
  anchorStart: integer("anchor_start"),
  anchorEnd: integer("anchor_end"),
  ...timestamps,
});

// Screenshots and files attached to events (inside versioning)
export const eventAttachments = pgTable("event_attachments", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventId: uuid("event_id")
    .notNull()
    .references(() => events.id, { onDelete: "cascade" }),
  fileUrl: text("file_url").notNull(),
  fileName: text("file_name").notNull(),
  fileType: text("file_type").notNull(), // MIME type
  description: text("description"),
  sortOrder: integer("sort_order").notNull().default(0),
  ...createdAt,
});
