# Measurement Assistant REST API v1

Base URL: `http://localhost:3000/api/v1` (dev) or `https://<domain>/api/v1` (prod)

## Authentication

All API endpoints (except key management) use **Bearer token** auth:

```
Authorization: Bearer ma_live_<key>
```

API keys are scoped to an account and grant access to all organizations/projects within that account.

### Create an API Key

Requires browser session auth (Supabase cookie). Call from the UI or via curl with session cookies.

```
POST /api/v1/api-keys
Body: { "name": "Claude Code - laptop" }
Response: { "id", "name", "keyPrefix", "createdAt", "key": "ma_live_..." }
```

The raw `key` is returned **only once**. Store it securely.

### List API Keys

```
GET /api/v1/api-keys
Response: [{ "id", "name", "keyPrefix", "lastUsedAt", "createdAt" }]
```

## Projects

### List projects

```
GET /projects
Response: [{ id, name, slug, description, url, organizationId, createdAt, updatedAt }]
```

### Create project

```
POST /projects
Body: { "name": "Main Website", "description?": "...", "url?": "https://...", "organizationId?": "uuid" }
Response: 201 { project }
```

If `organizationId` is omitted, the project is created in the account's default organization.

### Get project

```
GET /projects/:projectId
Response: { project }
```

### Update project

```
PATCH /projects/:projectId
Body: { "name": "Updated Name", "description?": "...", "url?": "..." }
Response: { project }
```

### Delete project

```
DELETE /projects/:projectId
Response: 204
```

## Workspaces

Workspaces are mutable branches forked from the latest published version.

### List workspaces

```
GET /projects/:projectId/workspaces
Response: [{ workspace + eventCount }]
```

### Create workspace

Forks from the latest published version (if one exists).

```
POST /projects/:projectId/workspaces
Body: { "name": "AI spec generation", "description?": "..." }
Response: 201 { workspace }
```

### Get workspace

```
GET /projects/:projectId/workspaces/:workspaceId
Response: { workspace }
```

### Update workspace

```
PATCH /projects/:projectId/workspaces/:workspaceId
Body: { "name": "...", "description?": "..." }
Response: { workspace }
```

### Delete workspace

```
DELETE /projects/:projectId/workspaces/:workspaceId
Response: 204
```

### Publish workspace

Creates a new published version from the workspace, then deletes the workspace.

```
POST /projects/:projectId/workspaces/:workspaceId/publish
Body: { "name?": "v3 - Added checkout events", "description?": "..." }
Response: { publishedVersion }
```

## Events

### List events (with parameters)

```
GET /projects/:projectId/workspaces/:workspaceId/events
Response: [{ event + parameters: [...] }]
```

### Create event

```
POST /projects/:projectId/workspaces/:workspaceId/events
Body: {
  "name": "purchase",
  "description?": "Fires when a transaction completes",
  "trigger?": "Thank you page load",
  "pagePattern?": "/checkout/thank-you",
  "category?": "ecommerce",
  "implementationNotes?": "..."
}
Response: 201 { event }
```

### Bulk create events (with parameters)

Designed for AI agents generating full specs in one call.

```
POST /projects/:projectId/workspaces/:workspaceId/events/bulk
Body: {
  "events": [
    {
      "name": "purchase",
      "description": "Transaction complete",
      "trigger": "Thank you page",
      "category": "ecommerce",
      "parameters": [
        { "name": "transaction_id", "type": "string", "isRequired": true },
        { "name": "value", "type": "number", "description": "Total order value" },
        { "name": "currency", "type": "string", "exampleValue": "USD" }
      ]
    },
    {
      "name": "add_to_cart",
      "description": "Product added to cart",
      "parameters": [
        { "name": "item_id", "type": "string", "isRequired": true },
        { "name": "item_name", "type": "string" },
        { "name": "price", "type": "number" }
      ]
    }
  ]
}
Response: { "created": 2, "events": [...] }
```

### Get event (with parameters)

```
GET /projects/:projectId/workspaces/:workspaceId/events/:eventId
Response: { event + parameters: [...] }
```

### Update event

```
PATCH /projects/:projectId/workspaces/:workspaceId/events/:eventId
Body: { "name": "...", ... }
Response: { event }
```

### Delete event

```
DELETE /projects/:projectId/workspaces/:workspaceId/events/:eventId
Response: 204
```

## Parameters

### List parameters

```
GET /projects/:projectId/workspaces/:workspaceId/events/:eventId/parameters
Response: [{ parameter }]
```

### Create parameter

```
POST /projects/:projectId/workspaces/:workspaceId/events/:eventId/parameters
Body: {
  "name": "transaction_id",
  "type": "string",      // string | number | boolean | array | object
  "description?": "...",
  "isRequired?": true,
  "exampleValue?": "T12345",
  "origin?": "backend",
  "parentId?": "uuid"    // for nested params under object/array types
}
Response: 201 { parameter }
```

### Get parameter

```
GET /projects/:projectId/workspaces/:workspaceId/events/:eventId/parameters/:parameterId
Response: { parameter }
```

### Update parameter

```
PATCH /projects/:projectId/workspaces/:workspaceId/events/:eventId/parameters/:parameterId
Body: { "name": "...", "type": "...", ... }
Response: { parameter }
```

### Delete parameter

```
DELETE /projects/:projectId/workspaces/:workspaceId/events/:eventId/parameters/:parameterId
Response: 204
```

## Published Spec (Read-Only)

### Get latest published version

Returns the current source of truth — the latest published version with all events and parameters.

```
GET /projects/:projectId/published
Response: {
  "version": { specVersion } | null,
  "events": [{ event + parameters: [...] }]
}
```

## Error Responses

All errors return JSON:

```json
{ "error": "Human-readable message" }
```

Validation errors (422):

```json
{
  "error": "Validation error",
  "details": [
    { "path": "name", "message": "String must contain at least 1 character(s)" }
  ]
}
```

Status codes: 400 (bad request), 401 (unauthorized), 403 (forbidden), 404 (not found), 422 (validation), 500 (server error).

## Typical AI Agent Workflow

1. **List projects** → `GET /projects`
2. **Create workspace** → `POST /projects/:id/workspaces` (forks from latest published)
3. **Bulk create events** → `POST /projects/:id/workspaces/:wsId/events/bulk`
4. **Review in UI** → Human reviews the workspace in the web app
5. **Publish** → `POST /projects/:id/workspaces/:wsId/publish`
