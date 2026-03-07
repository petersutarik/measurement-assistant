import type { InferSelectModel } from "drizzle-orm";
import type {
  users,
  accounts,
  organizations,
  projects,
  members,
} from "@/lib/db/schema";

export type User = InferSelectModel<typeof users>;
export type Account = InferSelectModel<typeof accounts>;
export type Organization = InferSelectModel<typeof organizations>;
export type Project = InferSelectModel<typeof projects>;
export type Member = InferSelectModel<typeof members>;
