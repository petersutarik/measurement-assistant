# Measurement Assistant API Reference

Machine-readable API reference for AI agents and integrations.

## Base

- **URL:** `http://localhost:3000/api/v1` (dev) / `https://<domain>/api/v1` (prod)
- **Auth:** `Authorization: Bearer ma_live_<key>`
- **Content-Type:** `application/json` (all POST/PATCH)

## Endpoints

### GET /projects
List all projects in the authenticated account's organization.
**Response:** `Project[]`

### POST /projects
Create a new project.
**Body:** `{ name: string, description?: string, url?: string, organizationId?: uuid }`
**Response:** `201 Project`

### GET /projects/:projectId
**Response:** `Project`

### PATCH /projects/:projectId
**Body:** `{ name: string, description?: string | null, url?: string | null }`
**Response:** `Project`

### DELETE /projects/:projectId
**Response:** `204`

---

### GET /projects/:projectId/published
Latest published spec with all events and parameters.
**Response:** `{ version: SpecVersion | null, events: EventWithParams[] }`

---

### GET /projects/:projectId/workspaces
List workspaces with event counts.
**Response:** `(Workspace & { eventCount: number })[]`

### POST /projects/:projectId/workspaces
Create workspace. Auto-forks from latest published version.
**Body:** `{ name: string, description?: string }`
**Response:** `201 Workspace`

### GET /projects/:projectId/workspaces/:workspaceId
**Response:** `Workspace`

### PATCH /projects/:projectId/workspaces/:workspaceId
**Body:** `{ name: string, description?: string }`
**Response:** `Workspace`

### DELETE /projects/:projectId/workspaces/:workspaceId
**Response:** `204`

### POST /projects/:projectId/workspaces/:workspaceId/publish
Publish workspace as new version. Deletes the workspace.
**Body:** `{ name?: string, description?: string }`
**Response:** `SpecVersion` (the new published version)

---

### GET /projects/:projectId/workspaces/:workspaceId/events
List events with nested parameters.
**Response:** `EventWithParams[]`

### POST /projects/:projectId/workspaces/:workspaceId/events
Create single event.
**Body:** `{ name: string, description?: string, trigger?: string, pagePattern?: string, category?: string, implementationNotes?: string }`
**Response:** `201 Event`

### POST /projects/:projectId/workspaces/:workspaceId/events/bulk
Create multiple events with parameters in one request. Max 200 events.
**Body:**
```json
{
  "events": [{
    "name": "string (required)",
    "description": "string?",
    "trigger": "string?",
    "pagePattern": "string?",
    "category": "string?",
    "implementationNotes": "string?",
    "parameters": [{
      "name": "string (required)",
      "type": "string|number|boolean|array|object (required)",
      "description": "string?",
      "isRequired": "boolean? (default false)",
      "exampleValue": "string?",
      "origin": "string?"
    }]
  }]
}
```
**Response:** `{ created: number, events: EventWithParams[] }`

### GET /projects/:projectId/workspaces/:workspaceId/events/:eventId
Event with parameters.
**Response:** `EventWithParams`

### PATCH /projects/:projectId/workspaces/:workspaceId/events/:eventId
**Body:** `{ name: string, description?: string, trigger?: string, pagePattern?: string, category?: string, implementationNotes?: string }`
**Response:** `Event`

### DELETE /projects/:projectId/workspaces/:workspaceId/events/:eventId
**Response:** `204`

---

### GET /projects/:projectId/workspaces/:workspaceId/events/:eventId/parameters
**Response:** `Parameter[]`

### POST /projects/:projectId/workspaces/:workspaceId/events/:eventId/parameters
**Body:** `{ name: string, type: "string"|"number"|"boolean"|"array"|"object", description?: string, isRequired?: boolean, exampleValue?: string, origin?: string, parentId?: uuid }`
**Response:** `201 Parameter`

### GET .../parameters/:parameterId
**Response:** `Parameter`

### PATCH .../parameters/:parameterId
**Body:** `{ name: string, type: string, description?: string, isRequired?: boolean, exampleValue?: string, origin?: string }`
**Response:** `Parameter`

### DELETE .../parameters/:parameterId
**Response:** `204`

---

### POST /api-keys (session auth, not Bearer token)
Create API key. Returns raw key once.
**Body:** `{ name: string }`
**Response:** `201 { id, name, keyPrefix, createdAt, key: "ma_live_..." }`

### GET /api-keys (session auth, not Bearer token)
List API keys (prefix only, no raw keys).
**Response:** `{ id, name, keyPrefix, lastUsedAt, createdAt }[]`

## Types

### Project
```typescript
{ id: uuid, organizationId: uuid, name: string, slug: string, description: string | null, url: string | null, createdAt: timestamp, updatedAt: timestamp }
```

### Workspace (SpecVersion with type="workspace")
```typescript
{ id: uuid, projectId: uuid, type: "workspace", name: string | null, description: string | null, forkedFromId: uuid | null, createdBy: uuid | null, createdAt: timestamp, updatedAt: timestamp }
```

### SpecVersion (published)
```typescript
{ id: uuid, projectId: uuid, type: "published", name: string | null, description: string | null, versionNumber: number, publishedAt: timestamp, publishedBy: uuid | null, createdBy: uuid | null, createdAt: timestamp, updatedAt: timestamp }
```

### Event
```typescript
{ id: uuid, specVersionId: uuid, name: string, description: string | null, trigger: string | null, pagePattern: string | null, category: string | null, implementationNotes: string | null, sortOrder: number, sourceEventId: uuid | null, createdAt: timestamp, updatedAt: timestamp }
```

### Parameter
```typescript
{ id: uuid, eventId: uuid, parentId: uuid | null, name: string, type: "string" | "number" | "boolean" | "array" | "object", description: string | null, isRequired: boolean, exampleValue: string | null, origin: string | null, sortOrder: number, sourceParameterId: uuid | null, createdAt: timestamp, updatedAt: timestamp }
```

### EventWithParams
```typescript
Event & { parameters: Parameter[] }
```

## Error Responses

| Status | Shape |
|-|-|
| 401 | `{ error: "Missing or invalid Authorization header" }` |
| 403 | `{ error: "No organization found for this account" }` |
| 404 | `{ error: "Project not found" }` (or Workspace/Event/Parameter) |
| 422 | `{ error: "Validation error", details: [{ path: string, message: string }] }` |
| 500 | `{ error: "Internal server error" }` |
