CREATE TYPE "public"."custom_field_entity_type" AS ENUM('event', 'parameter');--> statement-breakpoint
ALTER TABLE "custom_field_values" ALTER COLUMN "event_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "custom_field_definitions" ADD COLUMN "entity_type" "custom_field_entity_type" NOT NULL;--> statement-breakpoint
ALTER TABLE "custom_field_values" ADD COLUMN "parameter_id" uuid;--> statement-breakpoint
ALTER TABLE "custom_field_values" ADD CONSTRAINT "custom_field_values_parameter_id_parameters_id_fk" FOREIGN KEY ("parameter_id") REFERENCES "public"."parameters"("id") ON DELETE cascade ON UPDATE no action;