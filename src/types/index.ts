import type { InferSelectModel } from "drizzle-orm";
import type {
  // Tenant
  users,
  accounts,
  organizations,
  projects,
  accountMembers,
  memberAccess,
  // Spec
  specVersions,
  events,
  parameters,
  sharedSchemas,
  sharedSchemaFields,
  enums,
  enumValues,
  // Destinations
  destinations,
  destinationEvents,
  destinationParameters,
  projectDestinations,
  eventDestinationMappings,
  parameterMappings,
  // Custom fields
  customFieldDefinitions,
  customFieldValues,
  // Documents
  implementationDocuments,
  implDocumentEvents,
  shareLinks,
  // QA
  qaReports,
  qaIssues,
  // Comments
  comments,
  eventAttachments,
} from "@/lib/db/schema";

// Tenant
export type User = InferSelectModel<typeof users>;
export type Account = InferSelectModel<typeof accounts>;
export type Organization = InferSelectModel<typeof organizations>;
export type Project = InferSelectModel<typeof projects>;
export type AccountMember = InferSelectModel<typeof accountMembers>;
export type MemberAccess = InferSelectModel<typeof memberAccess>;

// Spec
export type SpecVersion = InferSelectModel<typeof specVersions>;
export type Event = InferSelectModel<typeof events>;
export type Parameter = InferSelectModel<typeof parameters>;
export type SharedSchema = InferSelectModel<typeof sharedSchemas>;
export type SharedSchemaField = InferSelectModel<typeof sharedSchemaFields>;
export type Enum = InferSelectModel<typeof enums>;
export type EnumValue = InferSelectModel<typeof enumValues>;

// Destinations
export type Destination = InferSelectModel<typeof destinations>;
export type DestinationEvent = InferSelectModel<typeof destinationEvents>;
export type DestinationParameter = InferSelectModel<
  typeof destinationParameters
>;
export type ProjectDestination = InferSelectModel<typeof projectDestinations>;
export type EventDestinationMapping = InferSelectModel<
  typeof eventDestinationMappings
>;
export type ParameterMapping = InferSelectModel<typeof parameterMappings>;

// Custom fields
export type CustomFieldDefinition = InferSelectModel<
  typeof customFieldDefinitions
>;
export type CustomFieldValue = InferSelectModel<typeof customFieldValues>;

// Documents
export type ImplementationDocument = InferSelectModel<
  typeof implementationDocuments
>;
export type ImplDocumentEvent = InferSelectModel<typeof implDocumentEvents>;
export type ShareLink = InferSelectModel<typeof shareLinks>;

// QA
export type QaReport = InferSelectModel<typeof qaReports>;
export type QaIssue = InferSelectModel<typeof qaIssues>;

// Comments
export type Comment = InferSelectModel<typeof comments>;
export type EventAttachment = InferSelectModel<typeof eventAttachments>;
