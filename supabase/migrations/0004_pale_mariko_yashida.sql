CREATE TYPE "public"."context_source_type" AS ENUM('note', 'url', 'file');--> statement-breakpoint
CREATE TYPE "public"."plan_status" AS ENUM('draft', 'completed');--> statement-breakpoint
CREATE TABLE "measurement_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"title" text NOT NULL,
	"status" "plan_status" DEFAULT 'draft' NOT NULL,
	"document" text DEFAULT '' NOT NULL,
	"messages" jsonb DEFAULT '[]' NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plan_context_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_id" uuid NOT NULL,
	"type" "context_source_type" NOT NULL,
	"name" text NOT NULL,
	"content" text DEFAULT '' NOT NULL,
	"url" text,
	"file_path" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plan_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"document" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "measurement_plans" ADD CONSTRAINT "measurement_plans_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "measurement_plans" ADD CONSTRAINT "measurement_plans_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_context_sources" ADD CONSTRAINT "plan_context_sources_plan_id_measurement_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."measurement_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_templates" ADD CONSTRAINT "plan_templates_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;