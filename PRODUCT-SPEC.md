# Measurement Assistant — Product Specification

## Vision

An AI-first, API-first platform for documenting, managing, and sharing marketing measurement implementations. Replaces spreadsheets and Google Docs with a purpose-built, versioned, collaborative system designed for agent workflows.

The primary workflow is AI-driven: agents create and update documentation via API/CLI, humans review and approve in the UI. Manual editing is supported but not the default path.

---

## Target Users

### In-house marketing/analytics teams
- Typically one organization with multiple projects (websites, apps)
- Need a single source of truth for all measurement documentation
- Want to hand off implementation specs to developers clearly

### Agencies and consultants
- Manage multiple clients, each as a separate organization
- Multiple projects per client
- Need to replicate and reference work across clients/projects
- Want to share read-only specs with client dev teams without requiring accounts

### Developers (consumers)
- Receive shareable links to implementation specs
- Need code snippets, firing conditions, parameter definitions, enums
- Can leave inline comments on specific parts of the spec
- Do not need an account — access via shareable link with comment permissions

---

## Core Concepts

### Account
The billing entity. Represents a company or agency. Owns one or more organizations.

### Organization
Represents a client (for agencies) or the company itself (for in-house teams). Contains projects. This is the primary grouping level for measurement documentation.

### Project
Typically maps to a single website or app, but the user can define what a project represents. Contains the full measurement specification — events, parameters, destinations, etc.

### Published Version
An immutable snapshot of the project's measurement spec. Represents the current source of truth (like `main` in git). When a new version is published, the previous one is preserved in the version history.

### Workspace
A mutable branch created from the latest published version. This is where edits happen — either by AI agents or humans. When ready, a workspace is published, creating a new published version. Multiple workspaces can exist simultaneously, but there is no merge conflict resolution — publishing is sequential and simple.

### Destinations
The platforms/tools where events are sent (GA4, Meta Pixel, Google Ads, TikTok, LinkedIn, etc.). The system comes with pre-built templates for popular destinations, but users can add fully custom destinations. Each event in the spec can be mapped to one or more destinations with platform-specific details.

### Developer View
A curated, read-only presentation of a project's measurement spec. The consultant/editor configures which fields are shown. Developers see code snippets, event descriptions, firing conditions, parameter definitions, expected values, and enums. Accessible via shareable link without requiring an account.

---

## Collaboration Model

### Roles (within an organization)
| Role | Permissions |
|-|-|
| Owner | Full access. Billing. Manage members. Delete org/projects. |
| Admin | Manage projects, members (except billing). Publish versions. |
| Editor | Create/edit workspaces. Propose changes. Cannot publish directly (depends on org settings). |
| Viewer | Read-only access to published versions and workspaces. Can comment. |
| Link access (no account) | Read-only access to developer view. Can leave inline comments. |

### Commenting System
- **Inline comments**: Users can select/highlight specific text within the spec (a parameter name, a description, a value) and leave a comment tied to that selection. Supports threaded replies.
- **General comments**: A separate comment thread per document/project for broader questions and discussion not tied to a specific element.

---

## AI-First Architecture

### Design Principles
- **API-first**: Every action that can be done in the UI can also be done via API. The API is the primary interface for AI agents.
- **Agent-ready**: The platform is designed to be operated by AI agents as the default workflow. Data structures, endpoints, and operations are optimized for programmatic interaction.
- **UI as review layer**: The web UI is primarily for humans to review AI-generated work, approve changes, configure views, share with stakeholders, and manage collaboration.
- **CLI support**: A CLI tool allows consultants to interact with the platform from their terminal or integrate with their existing AI coding workflows.

### AI Capabilities (v1)
- Generate initial measurement spec from a brief or description
- Update existing specs based on natural language instructions
- Cross-check specs for consistency and completeness
- Generate platform-specific code snippets for developers

### AI Capabilities (future)
- Cross-check specs against live implementations (via GTM/platform integrations)
- Replicate specs across projects with intelligent adaptation
- Suggest improvements based on industry best practices
- Auto-detect implementation gaps

---

## Versioning Model

### Git-inspired, simplified
- **Published version** = `main` branch. Immutable once published. Versioned with sequential numbers or timestamps.
- **Workspace** = feature branch. Created from the latest published version. Users make changes here.
- **Publishing** = merging to main. Takes the workspace state and creates a new published version.
- **No conflict resolution**: If two workspaces exist and one publishes first, the second workspace does not automatically rebase. The model is intentionally simple — workspaces are typically short-lived and owned by one person/agent at a time.
- **Version history**: All published versions are preserved. Users can view diffs between versions and see what changed.

---

## Platform / Destinations

### Pre-built destination templates
- Google Analytics 4 (GA4)
- Meta Pixel (Facebook)
- Google Ads
- TikTok Pixel
- LinkedIn Insight Tag
- Pinterest Tag
- Snapchat Pixel
- Twitter/X Pixel
- Microsoft Advertising (UET)

### Custom destinations
Users can create any custom destination with their own parameter mappings, naming conventions, and code snippet templates. The system is fully extensible.

---

## Developer Handoff

### Developer View features
- Curated by the consultant/editor — they choose which fields are visible
- Code snippets (copy-paste ready) for each event per destination
- Event descriptions: what the event is, when it fires, on which pages/screens
- Parameter definitions: name, type, expected values, enums, required/optional
- Live document — always reflects the latest published version
- Inline commenting — developers can ask questions about specific parts
- No account required — accessible via shareable link

---

## Scope Boundaries

### V1 — Core platform
- [ ] Account, organization, project hierarchy
- [ ] Event tracking spec documentation
- [ ] Conversion tracking setup documentation
- [ ] Customizable destinations with pre-built templates
- [ ] Workspace and published version model (git-like versioning)
- [ ] Version history with diffs
- [ ] Team roles and permissions (Owner, Admin, Editor, Viewer)
- [ ] Shareable developer view with inline commenting
- [ ] General comment threads
- [ ] Full REST/GraphQL API
- [ ] CLI tool for agent interaction
- [ ] AI: spec generation from brief
- [ ] AI: spec updates via natural language
- [ ] AI: consistency and completeness checks
- [ ] AI: code snippet generation per destination

### Future — Integrations & expansion
- [ ] GTM integration (read container, cross-check with spec)
- [ ] Destination platform integrations (GA4 API, Meta CAPI, etc.)
- [ ] Cross-project references (read-only)
- [ ] Notifications (email, Slack, webhooks)
- [ ] UTM naming convention management
- [ ] Audience/segment definitions
- [ ] Dashboard/reporting spec documentation
- [ ] Advanced billing tiers (per-seat, per-org, agency plans)
- [ ] Role-based access to third-party integrations
- [ ] Implementation status tracking per event (drafted → approved → implemented → verified)

---

## Data Model — Conceptual

### Three-Layer Architecture

```
SOURCE LAYER              TRANSPORT LAYER           DESTINATION LAYER
(where data originates)   (how it gets routed)      (where it ends up)

Data Layer (JS array)     Client-side GTM           GA4
Mobile SDK (future)       Server-side GTM           Meta Pixel
Server-to-server (future) Custom (no TMS)           Google Ads
                          (future)                  TikTok, LinkedIn, etc.
```

- **Source layer** is tool-agnostic. It defines what data exists — the canonical spec.
- **Transport layer** is how data gets routed (GTM, custom code, etc.). Modeled but not deeply implemented in v1. Important for future GTM integrations.
- **Destination layer** is where data ends up. Each destination has its own schema and parameter naming. Mappings transform source parameters to destination-specific format.

### Source Events (the canonical spec)

Each event represents a single `dataLayer.push()` call (or equivalent for other source types in the future).

**Default fields per event:**
- Event name (e.g., `add_to_cart`, `purchase`, `form_submit`)
- Description — what this event represents, what interaction triggers it
- Trigger condition — when it fires (click, page load, scroll, form submit, etc.)
- Page/screen — where it fires (URL patterns, page types, specific screens)
- Example URLs — concrete pages where this event should fire
- Screenshots — uploaded images showing the UI element that triggers the event
- Category/group — logical grouping (ecommerce, forms, navigation, video, etc.)
- Implementation notes — free-text notes for developers
- Parameters — list of key-value pairs with types, descriptions, and validation rules

**Custom fields:**
- Users can add custom fields at three levels: organization-wide, project-wide, or per-event
- Agency can define fields across all clients, or customize per project
- Custom fields can be referenced by AI agents in prompts/skills for automation
- Examples: QA status, priority, sprint assignment, responsible team

### Parameters

Parameters can be:
- **Flat**: simple key-value (e.g., `currency: "EUR"`, `value: 49.99`)
- **Nested objects**: (e.g., `ecommerce: { transaction_id, value, ... }`)
- **Arrays of objects**: (e.g., `items: [{ item_name, item_id, price, quantity }]`)

Each parameter has:
- Name
- Type (string, number, boolean, array, object)
- Description
- Required / optional flag
- Expected values or enum (e.g., `currency` = ISO 4217 codes)
- Example value
- **Origin/source**: where this value comes from
  - `dataLayer` — explicitly pushed by site code
  - `GTM built-in` — available natively in GTM (page URL, referrer, etc.)
  - `custom JS` — computed via custom JavaScript variable
  - `URL parameter` — extracted from query string
  - `cookie` — read from browser cookie
  - `first-party data` — from CRM, backend, etc.
  - Custom origins (user-definable)

### Shared Definitions

Defined once at the project level, referenced by multiple events:
- **Shared schemas** (e.g., the `Item` object used in all ecommerce events — `item_name`, `item_id`, `price`, `quantity`, `item_category`, etc.)
- **Enums** (e.g., `content_type: "blog" | "product" | "landing_page"`, currency codes, country codes)
- **User properties** (e.g., `user_id`, `membership_tier`, `login_status` — values available across events)
- **Common parameter sets** (e.g., a "page context" set with `page_type`, `page_category`, `language` reused in many events)

### Destinations

Each destination is based on a **template** that defines:
- Destination name and platform documentation link
- Standard events with expected parameters (e.g., Meta's `Purchase`, `AddToCart`, `Lead`)
- Parameter schema — what fields exist and what they mean
- Destination-specific configuration fields (e.g., GA4: "mark as conversion", Google Ads: "conversion ID + label")
- Code snippet templates for developer handoff
- AI agent instructions — how to use the template, what transformations to apply

**Template transparency:**
- Templates are fully visible to users, not black boxes
- Users can modify parameter names, add custom fields, add/remove standard events
- Users can fork a built-in template to create their own variant
- Templates include links to official platform documentation as reference

**Destination mapping per event:**
- Each source event maps to zero or more destinations
- Each mapping defines: which destination event it maps to, parameter transformations (source param → destination param), and any destination-specific config
- AI suggests mappings based on template knowledge; consultant reviews/adjusts

### Implementation Documents

A curated subset of the project's events, assembled into a shareable document for a specific audience (typically developers).

- Consultant selects which events to include
- Configures which fields are visible in the document
- Each implementation document is a **snapshot in time** — it captures the event definitions as they were when the document was created
- If events are updated later, the original implementation document still shows the original definitions
- New/updated events go into a new implementation document (e.g., "Phase 2" or "Bug fix batch #3")
- Shareable via link, no account required for viewing/commenting

**QA / Testing layer (tied to implementation documents):**
- Each implementation document can have an associated QA/testing document
- QA document captures: test results per event, pass/fail status, issues found
- Issue fields: which event, which parameter, what's wrong, severity, screenshots
- This creates a feedback loop: spec → implementation doc → QA doc → bug fixes → new implementation doc

### Field Configurability Summary

| Level | What can be configured |
|-|-|
| System defaults | Core fields that every event has (name, description, parameters, etc.) |
| Organization | Custom fields added across all projects for this org |
| Project | Custom fields for this specific project only |
| Event | Additional fields on a single event |
| Destination template | Schema, standard events, config fields, AI instructions |
| Implementation document | Which fields from the event spec are shown to the audience |

---

## Database Schema — Tables & Relationships

### Boundary: Outside vs Inside Versioning

**Outside versioning** (shared, structural — not copied per spec version):
- Tenant layer (accounts, orgs, projects, users, members)
- Destination definitions (destinations, destination events, destination parameters)
- Custom field definitions
- Implementation documents & QA

**Inside versioning** (copied in full when creating a workspace or publishing):
- Source events & parameters
- Shared schemas & enums
- Project destination activations (which destinations this project uses)
- Event-to-destination mappings & parameter mappings
- Custom field values

### Table Overview

#### Tenant Layer

| Table | Belongs to | Purpose |
|-|-|-|
| `users` | — | Auth/identity, profile |
| `accounts` | — | Billing entity (company or agency) |
| `organizations` | account | Client or business unit |
| `projects` | organization | Website, app, or user-defined scope |
| `account_members` | account + user | User's role within account |
| `member_access` | account_member + org/project | Granular access control per org or project |

#### Versioning

| Table | Belongs to | Purpose |
|-|-|-|
| `spec_versions` | project | Full spec container. Type: `workspace` or `published`. Workspace references the published version it was forked from. Published versions have sequential version numbers. |

#### Destination Definitions (outside versioning)

Destinations act as templates. When activated on a project, their standard events/params are seeded into the destination_events/parameters tables.

| Table | Belongs to | Purpose |
|-|-|-|
| `destinations` | system / account / org / project | Platform definition (Meta, GA4, Google Ads, etc.). Has scope + optional `parent_id` for inheritance. |
| `destination_events` | destination | Events for this platform (standard + custom, in same table). `is_standard` flag distinguishes seed data from user-added. |
| `destination_parameters` | destination_event | Parameters per destination event. `is_standard` flag. |

Template inheritance: system → account → org → project. Each level can add, modify, or override. Users can see and edit everything. Updating a system template can offer re-sync without overwriting customizations.

#### Source Spec (inside versioning — all reference `spec_version_id`)

| Table | Belongs to | Purpose |
|-|-|-|
| `events` | spec_version | Canonical source events (data layer). |
| `parameters` | event | Event parameters. Self-referencing `parent_id` for nesting. |
| `shared_schemas` | spec_version | Reusable parameter groups (e.g., Item object). |
| `shared_schema_fields` | shared_schema | Individual fields within a shared schema. |
| `enums` | spec_version | Reusable value sets. |
| `enum_values` | enum | Individual allowed values within an enum. |
| `project_destinations` | spec_version | Which destinations are active for this spec version. |
| `event_destination_mappings` | event + project_destination | Links a source event to a destination event. |
| `parameter_mappings` | event_destination_mapping | Maps source param → dest param, or static value. |

#### Custom Fields

| Table | Belongs to | Purpose |
|-|-|-|
| `custom_field_definitions` | org or project | Field definition. Lives outside versioning. |
| `custom_field_values` | event (inside spec_version) | Actual values per event. Copied with spec version. |

#### Implementation Documents & QA

| Table | Belongs to | Purpose |
|-|-|-|
| `implementation_documents` | project | Curated subset of events for developer handoff. Snapshot. |
| `impl_document_events` | impl_document | Frozen copy of event data at creation time. |
| `share_links` | impl_document | Token-based external access. |
| `qa_reports` | implementation_document | Testing results container. |
| `qa_issues` | qa_report | Individual issues per event/param. |

#### Commenting & Attachments

| Table | Belongs to | Purpose |
|-|-|-|
| `comments` | polymorphic | Threaded, with optional text selection anchor. |
| `event_attachments` | event (inside versioning) | Screenshots and files attached to events. |

### Relationship Diagram

```
account
  ├── account_members → member_access (per org or project)
  └── organizations
        └── projects
              ├── spec_versions (workspace | published)
              │     ├── events
              │     │     ├── parameters (self-ref for nesting)
              │     │     │     └── → refs shared_schemas, enums
              │     │     ├── event_destination_mappings
              │     │     │     └── parameter_mappings
              │     │     ├── custom_field_values
              │     │     └── event_attachments
              │     ├── shared_schemas → shared_schema_fields
              │     ├── enums → enum_values
              │     └── project_destinations → refs destinations
              │
              ├── implementation_documents
              │     ├── impl_document_events (snapshot)
              │     ├── share_links
              │     └── qa_reports → qa_issues
              │
              └── custom_field_definitions (org or project scope)

destinations (system / account / org / project, with inheritance)
  ├── destination_events (standard + custom)
  └── destination_parameters
```

### Column Definitions

#### `users`

| Column | Type | Notes |
|-|-|-|
| id | uuid, pk | |
| email | text, unique | |
| name | text | |
| avatar_url | text, nullable | |
| created_at | timestamp | |
| updated_at | timestamp | |

#### `accounts`

| Column | Type | Notes |
|-|-|-|
| id | uuid, pk | |
| name | text | Company/agency name |
| slug | text, unique | URL-friendly identifier |
| billing_plan | text, nullable | For future billing |
| created_at | timestamp | |
| updated_at | timestamp | |

#### `organizations`

| Column | Type | Notes |
|-|-|-|
| id | uuid, pk | |
| account_id | uuid, fk → accounts | |
| name | text | Client name or business unit |
| slug | text, unique per account | |
| created_at | timestamp | |
| updated_at | timestamp | |

#### `projects`

| Column | Type | Notes |
|-|-|-|
| id | uuid, pk | |
| organization_id | uuid, fk → organizations | |
| name | text | e.g., "Main website", "iOS app" |
| slug | text, unique per org | |
| description | text, nullable | |
| url | text, nullable | Website URL if applicable |
| created_at | timestamp | |
| updated_at | timestamp | |

#### `account_members`

| Column | Type | Notes |
|-|-|-|
| id | uuid, pk | |
| account_id | uuid, fk → accounts | |
| user_id | uuid, fk → users | |
| role | enum: owner, admin, member | Account-wide role |
| created_at | timestamp | |

#### `member_access`

| Column | Type | Notes |
|-|-|-|
| id | uuid, pk | |
| account_member_id | uuid, fk → account_members | |
| organization_id | uuid, fk, nullable | If set: access to this org |
| project_id | uuid, fk, nullable | If set: access to specific project only |
| role | enum: admin, editor, viewer | What they can do at this scope |
| created_at | timestamp | |

Access logic:
- `organization_id` set, `project_id` null → access to all projects in that org
- Both set → access to that specific project only
- Account owner/admin → implicit access to everything

#### `spec_versions`

| Column | Type | Notes |
|-|-|-|
| id | uuid, pk | |
| project_id | uuid, fk → projects | |
| type | enum: workspace, published | |
| name | text, nullable | Workspace name (e.g., "Q1 ecommerce update"). Null for published. |
| description | text, nullable | What changed / purpose of workspace |
| version_number | int, nullable | Sequential, only for published versions |
| forked_from_id | uuid, nullable, fk → spec_versions | Which published version this workspace branched from |
| published_at | timestamp, nullable | When this became a published version |
| published_by | uuid, nullable, fk → users | |
| created_by | uuid, fk → users | |
| created_at | timestamp | |
| updated_at | timestamp | |

#### `destinations`

| Column | Type | Notes |
|-|-|-|
| id | uuid, pk | |
| parent_id | uuid, nullable, fk → destinations | Inherits from this template |
| scope_type | enum: system, account, org, project | Where this destination lives |
| scope_id | uuid, nullable | FK to account/org/project. Null for system. |
| name | text | e.g., "Google Analytics 4", "Meta Pixel" |
| slug | text | |
| description | text, nullable | |
| docs_url | text, nullable | Link to official platform docs |
| icon_url | text, nullable | |
| ai_instructions | text, nullable | Instructions for AI agents on how to use this destination |
| snippet_template | text, nullable | Code snippet template for developer handoff |
| created_at | timestamp | |
| updated_at | timestamp | |

#### `destination_events`

| Column | Type | Notes |
|-|-|-|
| id | uuid, pk | |
| destination_id | uuid, fk → destinations | |
| name | text | e.g., "AddToCart", "Purchase", "Conversion" |
| description | text, nullable | |
| is_standard | boolean, default true | Standard (from template) vs user-added |
| docs_url | text, nullable | Link to docs for this specific event |
| created_at | timestamp | |
| updated_at | timestamp | |

#### `destination_parameters`

| Column | Type | Notes |
|-|-|-|
| id | uuid, pk | |
| destination_event_id | uuid, fk → destination_events | |
| name | text | e.g., "content_ids", "conversion_id" |
| type | text | string, number, boolean, array, object |
| description | text, nullable | |
| is_required | boolean, default false | |
| is_standard | boolean, default true | |
| example_value | text, nullable | |
| created_at | timestamp | |
| updated_at | timestamp | |

#### `events`

| Column | Type | Notes |
|-|-|-|
| id | uuid, pk | |
| spec_version_id | uuid, fk → spec_versions | |
| name | text | e.g., "add_to_cart" |
| description | text, nullable | What this event represents |
| trigger | text, nullable | When it fires (click, page load, scroll, etc.) |
| page_pattern | text, nullable | URL patterns or page types where it fires |
| example_urls | text[], nullable | Concrete example URLs |
| category | text, nullable | Logical grouping (ecommerce, forms, etc.) |
| implementation_notes | text, nullable | Free-text notes for developers |
| sort_order | int, default 0 | For ordering in UI |
| created_at | timestamp | |
| updated_at | timestamp | |

#### `parameters`

| Column | Type | Notes |
|-|-|-|
| id | uuid, pk | |
| event_id | uuid, fk → events | |
| parent_id | uuid, nullable, fk → parameters | For nesting (items[].item_name) |
| shared_schema_id | uuid, nullable, fk → shared_schemas | If this param references a shared schema |
| name | text | e.g., "currency", "items" |
| type | enum: string, number, boolean, array, object | |
| description | text, nullable | |
| is_required | boolean, default false | |
| example_value | text, nullable | |
| enum_id | uuid, nullable, fk → enums | References a reusable value set |
| origin | text, nullable | dataLayer, GTM built-in, custom JS, URL param, cookie, etc. |
| sort_order | int, default 0 | |
| created_at | timestamp | |
| updated_at | timestamp | |

#### `shared_schemas`

| Column | Type | Notes |
|-|-|-|
| id | uuid, pk | |
| spec_version_id | uuid, fk → spec_versions | |
| name | text | e.g., "Item", "PageContext" |
| description | text, nullable | |
| created_at | timestamp | |
| updated_at | timestamp | |

#### `shared_schema_fields`

| Column | Type | Notes |
|-|-|-|
| id | uuid, pk | |
| shared_schema_id | uuid, fk → shared_schemas | |
| name | text | |
| type | enum: string, number, boolean, array, object | |
| description | text, nullable | |
| is_required | boolean, default false | |
| example_value | text, nullable | |
| enum_id | uuid, nullable, fk → enums | |
| origin | text, nullable | |
| sort_order | int, default 0 | |
| created_at | timestamp | |
| updated_at | timestamp | |

#### `enums`

| Column | Type | Notes |
|-|-|-|
| id | uuid, pk | |
| spec_version_id | uuid, fk → spec_versions | |
| name | text | e.g., "content_type", "currency_code" |
| description | text, nullable | |
| created_at | timestamp | |
| updated_at | timestamp | |

#### `enum_values`

| Column | Type | Notes |
|-|-|-|
| id | uuid, pk | |
| enum_id | uuid, fk → enums | |
| value | text | e.g., "blog", "product", "USD" |
| label | text, nullable | Human-readable label if different from value |
| sort_order | int, default 0 | |
| created_at | timestamp | |

#### `project_destinations`

| Column | Type | Notes |
|-|-|-|
| id | uuid, pk | |
| spec_version_id | uuid, fk → spec_versions | |
| destination_id | uuid, fk → destinations | |
| config | jsonb, nullable | Project-specific destination config (measurement ID, pixel ID, etc.) |
| created_at | timestamp | |

#### `event_destination_mappings`

| Column | Type | Notes |
|-|-|-|
| id | uuid, pk | |
| event_id | uuid, fk → events | Source event |
| project_destination_id | uuid, fk → project_destinations | |
| destination_event_id | uuid, fk → destination_events | Which destination event it maps to |
| config | jsonb, nullable | Destination-specific config for this mapping |
| created_at | timestamp | |
| updated_at | timestamp | |

#### `parameter_mappings`

| Column | Type | Notes |
|-|-|-|
| id | uuid, pk | |
| event_destination_mapping_id | uuid, fk → event_destination_mappings | |
| destination_parameter_id | uuid, fk → destination_parameters | |
| mapping_type | enum: reference, static | Reference = source param, static = constant value |
| source_parameter_id | uuid, nullable, fk → parameters | When mapping_type = reference |
| static_value | text, nullable | When mapping_type = static |
| transform_expression | text, nullable | Optional transformation logic |
| created_at | timestamp | |

#### `custom_field_definitions`

| Column | Type | Notes |
|-|-|-|
| id | uuid, pk | |
| scope_type | enum: organization, project | |
| scope_id | uuid | FK to org or project |
| name | text | e.g., "QA Status", "Sprint" |
| field_type | enum: text, number, select, multi_select, boolean, date | |
| options | jsonb, nullable | For select/multi_select: list of allowed values |
| sort_order | int, default 0 | |
| created_at | timestamp | |
| updated_at | timestamp | |

#### `custom_field_values`

| Column | Type | Notes |
|-|-|-|
| id | uuid, pk | |
| custom_field_definition_id | uuid, fk → custom_field_definitions | |
| event_id | uuid, fk → events | Inside versioning — copied with spec |
| value | jsonb | Flexible storage for any field type |
| created_at | timestamp | |
| updated_at | timestamp | |

#### `implementation_documents`

| Column | Type | Notes |
|-|-|-|
| id | uuid, pk | |
| project_id | uuid, fk → projects | |
| spec_version_id | uuid, fk → spec_versions | Which published version this was created from |
| title | text | e.g., "Phase 1 — Ecommerce Events" |
| description | text, nullable | |
| visible_fields | jsonb | Which event fields to show in developer view |
| created_by | uuid, fk → users | |
| created_at | timestamp | |
| updated_at | timestamp | |

#### `impl_document_events`

| Column | Type | Notes |
|-|-|-|
| id | uuid, pk | |
| implementation_document_id | uuid, fk → implementation_documents | |
| event_id | uuid, fk → events | Reference to original event (for linking) |
| snapshot_data | jsonb | Frozen copy of event + parameters + mappings at creation time |
| sort_order | int, default 0 | |
| created_at | timestamp | |

#### `share_links`

| Column | Type | Notes |
|-|-|-|
| id | uuid, pk | |
| implementation_document_id | uuid, fk → implementation_documents | |
| token | text, unique | Random URL-safe token |
| permission | enum: view, comment | |
| expires_at | timestamp, nullable | |
| created_by | uuid, fk → users | |
| created_at | timestamp | |

#### `qa_reports`

| Column | Type | Notes |
|-|-|-|
| id | uuid, pk | |
| implementation_document_id | uuid, fk → implementation_documents | |
| title | text, nullable | |
| status | enum: in_progress, completed | |
| created_by | uuid, fk → users | |
| created_at | timestamp | |
| updated_at | timestamp | |

#### `qa_issues`

| Column | Type | Notes |
|-|-|-|
| id | uuid, pk | |
| qa_report_id | uuid, fk → qa_reports | |
| event_id | uuid, nullable, fk → events | Which event has the issue |
| parameter_name | text, nullable | Which parameter if applicable |
| issue_type | enum: missing, incorrect_value, wrong_trigger, other | |
| severity | enum: critical, major, minor | |
| description | text | |
| status | enum: open, fixed, wont_fix | |
| created_by | uuid, fk → users | |
| created_at | timestamp | |
| updated_at | timestamp | |

#### `comments`

| Column | Type | Notes |
|-|-|-|
| id | uuid, pk | |
| parent_comment_id | uuid, nullable, fk → comments | For threading |
| commentable_type | text | Polymorphic: event, impl_document, qa_issue |
| commentable_id | uuid | |
| user_id | uuid, nullable, fk → users | Null for anonymous (share link) commenters |
| author_name | text, nullable | For anonymous commenters |
| body | text | |
| anchor_field | text, nullable | Which field the text was selected from |
| anchor_start | int, nullable | Selection start offset |
| anchor_end | int, nullable | Selection end offset |
| created_at | timestamp | |
| updated_at | timestamp | |

#### `event_attachments`

| Column | Type | Notes |
|-|-|-|
| id | uuid, pk | |
| event_id | uuid, fk → events | Inside versioning — copied with spec |
| file_url | text | Storage URL |
| file_name | text | |
| file_type | text | MIME type |
| description | text, nullable | Caption/alt text |
| sort_order | int, default 0 | |
| created_at | timestamp | |

---

## Tech Stack

| Layer | Choice | Rationale |
|-|-|-|
| Framework | Next.js 15 (App Router) | Best Vercel integration, RSC for performance, API routes for REST API |
| Hosting | Vercel | Zero-config deploys, edge functions, good free tier |
| Database | Supabase (Postgres) | Managed Postgres, built-in RLS, realtime available if needed later |
| Auth | Supabase Auth | Already in ecosystem. Email, OAuth, magic links. Handles anonymous share link access. |
| Storage | Supabase Storage | Screenshots/attachments. Same ecosystem. |
| ORM | Drizzle | Type-safe, lightweight, close to SQL, good Postgres support |
| Validation | Zod | Schema validation shared between frontend and API |
| UI | shadcn/ui + Tailwind CSS | Copy-paste components, full control, professional look |
| API style | REST (Next.js API routes) | Simpler than GraphQL for CLI/agent consumption. Co-located with app. |
| AI integration | Claude API via user's own Claude Code | No AI infra to build in v1. Users bring their own Claude instance. Agents call the REST API directly. |

### Architecture Decisions

**Single Next.js app, no monorepo.** Solo developer — monorepo adds overhead without benefit. API routes live alongside the UI. Can split into separate worker service later if heavy background processing is needed.

**REST over GraphQL.** For an API-first product consumed by CLI and AI agents, REST is simpler to call, document, and build. The data model is relational but queries aren't deeply nested enough to justify GraphQL complexity.

**Supabase Auth over Clerk.** Already using Supabase for DB and storage — one fewer vendor and integration point. Supabase Auth covers the needs: team invites, role management, magic links for share access.

**Drizzle over Prisma.** Lighter weight, faster, stays closer to raw SQL. The complex relational schema benefits from more query control without Prisma's overhead.

**No custom CLI in v1.** Users interact with the API through their own Claude Code instance. The REST API is the agent interface. A dedicated CLI can be built later if needed.

**No AI infrastructure in v1.** The platform doesn't run AI models — it exposes an API that AI agents consume. Users bring their own Claude. This eliminates AI cost, infrastructure, and rate limiting concerns from the initial build.

---

## Open Questions (to be decided)
- Billing model details
- Transport layer modeling depth for v1
