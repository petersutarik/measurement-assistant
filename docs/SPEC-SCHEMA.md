# Measurement Spec Schema v1

File-based measurement specification format for defining dataLayer events, parameters, destination mappings, and deployment configuration. Designed to be the single source of truth for a project's tracking implementation.

## File Location

```
.measurement/
  spec/<slug>.json       # The spec file
  plans/<slug>.md        # Source plan (if generated via /plan)
  context/<slug>/        # Scraped site context
  examples/              # Example specs
```

## Top-Level Structure

```json
{
  "$schema": "https://measurement-assistant.dev/spec/v1.json",
  "version": 1,
  "project": { ... },
  "parameters": { ... },
  "events": [ ... ],
  "destinations": [ ... ],
  "destinationMappings": [ ... ]
}
```

| Field | Type | Required | Description |
|-|-|-|-|
| $schema | string | no | Schema URL for editor validation |
| version | number | yes | Schema version (currently `1`) |
| project | object | yes | Project metadata |
| parameters | object | yes | Parameter definitions dictionary |
| events | array | yes | Event definitions |
| destinations | array | yes | Destination platform configurations |
| destinationMappings | array | yes | Source event to destination event mappings |

---

## `project`

Project-level metadata.

```json
{
  "name": "Acme E-commerce",
  "url": "https://acme.com",
  "type": "ecommerce",
  "description": "Multi-brand outdoor gear retailer"
}
```

| Field | Type | Required | Description |
|-|-|-|-|
| name | string | yes | Human-readable project name |
| url | string | no | Primary website URL |
| type | string | no | Site type: `ecommerce`, `saas`, `lead_generation`, `content`, `hybrid` |
| description | string | no | Brief project description |

---

## `parameters`

A flat dictionary of parameter definitions keyed by parameter name. Parameters are defined once and referenced by name in events.

```json
{
  "transaction_id": {
    "type": "string",
    "required": true,
    "origin": "backend",
    "description": "Unique order identifier from payment processor"
  },
  "currency": {
    "type": "string",
    "required": true,
    "origin": "backend",
    "pattern": "^[A-Z]{3}$",
    "exampleValue": "EUR",
    "description": "ISO 4217 currency code"
  },
  "page_type": {
    "type": "string",
    "scope": "global",
    "origin": "computed",
    "enum": ["homepage", "plp", "pdp", "cart", "checkout"],
    "description": "Page template classification"
  }
}
```

| Field | Type | Required | Default | Description |
|-|-|-|-|-|
| type | string | yes | — | `string`, `number`, `boolean`, `array`, `object` |
| description | string | no | — | What this parameter captures |
| required | boolean | no | `false` | Whether the parameter must be present |
| scope | string | no | `"event"` | `"event"` (per-event) or `"global"` (on all events) |
| origin | string | no | — | Data source: `backend`, `frontend`, `dom`, `url`, `cookie`, `localStorage`, `computed`, `static` |
| exampleValue | string | no | — | Example value for documentation |
| enum | string[] | no | — | Allowed values (for constrained parameters) |
| pattern | string | no | — | Regex pattern for validation |

### Nested Parameters (arrays and objects)

Parameters with `type: "array"` or `type: "object"` define their child properties via the `items` field. Nesting is recursive — child properties can themselves have `items`.

**Array example** — each element in the array has these properties:

```json
{
  "items": {
    "type": "array",
    "description": "List of products",
    "items": {
      "item_id": { "type": "string", "required": true, "origin": "backend", "description": "Product SKU" },
      "item_name": { "type": "string", "required": true, "origin": "backend", "description": "Product display name" },
      "price": { "type": "number", "required": true, "origin": "backend", "description": "Unit price" },
      "quantity": { "type": "number", "origin": "frontend", "exampleValue": "1", "description": "Number of units" }
    }
  }
}
```

Notation in documentation: `items[].item_id`, `items[].price` (bracket notation for arrays).

**Object example** — a structured object with named properties:

```json
{
  "user_data": {
    "type": "object",
    "description": "Enhanced conversions user data object",
    "origin": "backend",
    "items": {
      "email": { "type": "string", "required": true, "origin": "backend", "description": "SHA256-hashed email address" },
      "phone_number": { "type": "string", "origin": "backend", "description": "SHA256-hashed phone in E.164 format" },
      "address": {
        "type": "object",
        "origin": "backend",
        "description": "Hashed address fields",
        "items": {
          "street": { "type": "string", "origin": "backend", "description": "SHA256-hashed street address" },
          "city": { "type": "string", "origin": "backend", "description": "SHA256-hashed city name" },
          "country": { "type": "string", "origin": "backend", "description": "ISO 3166-1 alpha-2 country code" }
        }
      }
    }
  }
}
```

Notation in documentation: `user_data.email`, `user_data.address.city` (dot notation for objects).

**Rules:**
- The `items` field is an object where keys are child property names and values follow the same parameter schema (minus `scope`, which only applies at the top level)
- Nesting is recursive to any depth (e.g., `user_data.address.city`)
- Arrays use bracket notation (`items[].item_id`), objects use dot notation (`user_data.email`)

### Global Parameters

Parameters with `scope: "global"` are automatically included on every event. They don't need to be listed in each event's `parameters` array. Common examples: `user_id`, `logged_in`, `page_type`.

---

## `events`

Array of event definitions. Each event represents a distinct dataLayer push.

```json
{
  "name": "purchase",
  "description": "Transaction completed successfully",
  "category": "ecommerce",
  "parameters": ["transaction_id", "value", "currency", "items"],
  "conversion": {
    "isPrimary": true,
    "valueParameter": "value",
    "currencyParameter": "currency"
  },
  "triggers": [
    {
      "name": "Order confirmation",
      "trigger": "Thank you page load after successful payment",
      "pagePattern": "/checkout/thank-you",
      "source": "client",
      "values": {
        "transaction_id": "ORD-20260325-001",
        "value": 219.98,
        "currency": "EUR"
      }
    }
  ]
}
```

| Field | Type | Required | Description |
|-|-|-|-|
| name | string | yes | Event name (snake_case) |
| description | string | no | What this event represents |
| category | string | no | Grouping: `core`, `ecommerce`, `engagement`, `lead_generation`, `content` |
| parameters | string[] | yes | Array of parameter names (references to `parameters` keys) |
| conversion | object | no | Conversion tracking configuration |
| triggers | array | yes | Concrete firing scenarios |

### `event.conversion`

Marks the event as a conversion for ad platform optimization.

| Field | Type | Required | Description |
|-|-|-|-|
| isPrimary | boolean | yes | Whether this is a primary conversion (affects bidding) |
| valueParameter | string\|null | yes | Parameter name containing the monetary value, or `null` |
| currencyParameter | string\|null | yes | Parameter name containing the currency code, or `null` |

### `event.triggers[]`

Each trigger is a concrete instance of when the event fires, with expected parameter values. Triggers serve as implementation guides for developers and test cases for QA.

When an event has a **single trigger**, the trigger details are shown inline on the event row. When there are **multiple triggers**, the event row shows a summary and the trigger details are expandable.

```json
{
  "name": "PDP add to cart",
  "trigger": "Add to cart button click on product detail page",
  "pagePattern": "/product/*",
  "exampleUrl": "https://acme.com/product/trail-runner-pro",
  "screenshots": ["https://storage.example.com/screenshots/pdp-add-to-cart.png"],
  "source": "client",
  "parameters": ["item_id", "item_name", "price", "currency"],
  "values": {
    "currency": "EUR",
    "price": 129.99,
    "item_id": "SKU-001",
    "item_name": "Trail Runner Pro"
  }
}
```

| Field | Type | Required | Description |
|-|-|-|-|
| name | string | yes | Short label for this trigger instance |
| trigger | string | yes | Specific description of what causes the event |
| pagePattern | string | no | URL pattern where this trigger occurs |
| exampleUrl | string | no | Concrete URL where this trigger can be tested (used for QA validation) |
| screenshots | string[] | no | URLs of screenshots showing the trigger context on the page |
| source | string | no | `"client"` (dataLayer push) or `"server"` (backend/webhook) |
| parameters | string[] | no | Subset of event-level parameters used by this trigger. If omitted, inherits all event parameters |
| values | object | no | Expected parameter values for this specific trigger |

The `values` object maps parameter names to their expected values for this trigger instance. The same event can have different triggers with different values (e.g., `form_submit` on a contact form vs newsletter form).

**`exampleUrl`** — a real page URL where this trigger can be found and tested. Used by QA validation tools to navigate to the page and verify the event fires correctly. Each trigger has its own URL since different variants fire on different pages.

**`screenshots`** — array of image URLs showing the UI element or page state associated with this trigger. Stored in Supabase Storage when using the SaaS app, or locally in `.measurement/screenshots/<event-slug>/` when working via Claude Code skills. Screenshots help developers and QA understand exactly where and how the trigger fires.

#### Per-Trigger Parameters

Different triggers of the same event may use different subsets of parameters. The event-level `parameters` array is the **superset** (union of all trigger parameters). Each trigger can optionally declare its own `parameters` array as a **subset**.

Example: `purchase` has 7 parameters at the event level, but a server-side webhook trigger only sends 3:

```json
{
  "name": "purchase",
  "parameters": ["transaction_id", "value", "currency", "items", "coupon", "shipping_tier", "payment_method"],
  "triggers": [
    {
      "name": "Order confirmation",
      "source": "client",
      "parameters": ["transaction_id", "value", "currency", "items", "coupon", "shipping_tier", "payment_method"]
    },
    {
      "name": "Server-side confirmation",
      "source": "server",
      "parameters": ["transaction_id", "value", "currency"]
    }
  ]
}
```

If a trigger omits `parameters`, it inherits the full event-level list (backwards compatible).

---

## `destinations`

Array of destination platform configurations.

```json
{
  "platform": "ga4",
  "config": { "measurementId": "G-XXXXXXXXXX" },
  "consent": { "required": "analytics", "mode": "advanced" },
  "eventSettings": {
    "parameters": ["page_type"],
    "userProperties": ["user_id", "logged_in"]
  }
}
```

| Field | Type | Required | Description |
|-|-|-|-|
| platform | string | yes | Platform identifier: `ga4`, `meta-capi`, `google-ads`, `tiktok`, etc. |
| config | object | yes | Platform-specific config (measurement IDs, pixel IDs, etc.) |
| consent | object | no | Consent requirements |
| eventSettings | object | no | GA4-specific: shared parameters bundled into a reusable Event Settings Variable |

### `destination.consent`

| Field | Type | Required | Description |
|-|-|-|-|
| required | string | yes | Consent category: `analytics`, `marketing`, `functional` |
| mode | string | no | `"advanced"` (fires with restricted data) or `"strict"` (blocks entirely) |

### `destination.eventSettings` (GA4-specific)

Defines a reusable GA4 Event Settings Variable in GTM. Parameters and user properties listed here are automatically inherited by every GA4 event tag that has `useEventSettings: true` (the default).

```json
{
  "parameters": ["page_type"],
  "userProperties": ["user_id", "logged_in"]
}
```

| Field | Type | Required | Description |
|-|-|-|-|
| parameters | string[] | yes | Source parameter names to include as event parameters in the settings variable |
| userProperties | string[] | yes | Source parameter names to include as GA4 user properties in the settings variable |

How `/deploy-gtm` uses this:
1. Creates a GA4 Event Settings Variable containing the listed parameters and user properties
2. Attaches the variable to each GA4 event tag where `useEventSettings !== false`
3. Tag-level parameters (from `destinationMappings`) are added on top and override any same-named settings variable params

### `destination.tagSettings` (platform-specific)

Configuration for the GTM tag template used by this destination. Controls template-specific features that affect how the tag processes data.

```json
{
  "platform": "meta-capi",
  "config": { "pixelId": "1234567890" },
  "tagSettings": {
    "template": "stape-facebook-pixel",
    "enableDataLayerMapping": true,
    "enableAdvancedMatching": true,
    "eventEnhancement": false,
    "disableAutoConfig": true,
    "disablePushState": true,
    "notes": "..."
  }
}
```

| Field | Type | Required | Description |
|-|-|-|-|
| template | string | yes | GTM tag template identifier (e.g., `stape-facebook-pixel`) |
| notes | string | no | Human-readable notes about the tag configuration |
| *...other fields* | any | no | Template-specific settings (see below) |

#### Stape Facebook Pixel (`stape-facebook-pixel`)

| Field | Type | Default | Description |
|-|-|-|-|
| enableDataLayerMapping | boolean | `true` | Auto-map GA4 ecommerce data from dataLayer to Meta format. When enabled, `items[]` is automatically transformed to `contents[]`/`content_ids[]` — parameter transforms in `destinationMappings` become documentation-only |
| enableAdvancedMatching | boolean | `true` | Send hashed user data (email, phone, name, address) for enhanced matching |
| eventEnhancement | boolean | `false` | Persist user data in localStorage across events for richer matching |
| disableAutoConfig | boolean | `false` | Disable Meta's automatic metadata and click collection |
| disablePushState | boolean | `false` | Disable automatic PageView on SPA history events (enable for SPAs where you control page_view events) |

**Important:** When `enableDataLayerMapping` is `true` (the default), the Stape template internally handles the GA4 → Meta ecommerce transform:
- `items[].item_id` → `content_ids[]`
- `items[]` → `contents[]` (with `item_id → id`, `price → item_price`, `quantity → quantity`)
- `value`, `currency`, `search_term → search_string`
- `content_type` set to `"product"` automatically
- `num_items` calculated for `InitiateCheckout` and `Purchase`
- Falls back to `currency: "USD"` and `value: 0` for `Purchase` if missing

The `transform` fields in `destinationMappings` still serve as documentation of what the mapping produces, and are needed when not using the Stape template (e.g., custom implementations, server-side direct API calls).

---

## `destinationMappings`

Maps source events to destination events with parameter translation and transformations.

```json
{
  "sourceEvent": "purchase",
  "mappings": [
    {
      "destination": "ga4",
      "destinationEvent": "purchase",
      "useEventSettings": true,
      "parameters": [
        { "source": "transaction_id", "dest": "transaction_id" },
        { "source": "value", "dest": "value" },
        { "source": "currency", "dest": "currency" },
        { "source": "items", "dest": "items" },
        { "source": "payment_method", "dest": "payment_type" }
      ]
    },
    {
      "destination": "meta-capi",
      "destinationEvent": "Purchase",
      "parameters": [
        { "source": "transaction_id", "dest": "event_id" },
        { "source": "value", "dest": "value" },
        { "source": "currency", "dest": "currency" },
        {
          "source": "items", "dest": "content_ids",
          "transform": "pluck", "field": "item_id",
          "description": "items.map(i => i.item_id)"
        },
        {
          "source": "items", "dest": "contents",
          "transform": "mapObject",
          "fields": {
            "item_id": "id",
            "item_name": "name",
            "price": "item_price",
            "quantity": "quantity"
          },
          "description": "items.map(i => ({ id: i.item_id, name: i.item_name, item_price: i.price, quantity: i.quantity }))"
        }
      ]
    }
  ]
}
```

| Field | Type | Required | Description |
|-|-|-|-|
| sourceEvent | string | yes | Source event name (must match an entry in `events`) |
| mappings | array | yes | Per-destination mappings |

### `destinationMappings.mappings[]`

| Field | Type | Required | Description |
|-|-|-|-|
| destination | string | yes | Platform identifier (must match a `destinations[].platform`) |
| destinationEvent | string | yes | Event name in the destination platform's convention |
| useEventSettings | boolean | no | Whether to attach the destination's Event Settings Variable to this tag. Defaults to `true`. Set to `false` for tags that shouldn't inherit shared params (e.g., server-side-only events) |
| parameters | array | yes | Array of parameter mapping objects (tag-level, added on top of event settings) |

### `destinationMappings.mappings[].parameters[]`

Each parameter mapping describes how a source parameter maps to a destination parameter, including any transformation needed.

| Field | Type | Required | Description |
|-|-|-|-|
| source | string | yes | Source parameter name |
| dest | string | yes | Destination parameter name |
| transform | string | no | Transform type: `"direct"` (default), `"pluck"`, `"mapObject"` |
| field | string | no | For `pluck`: which field to extract from array items |
| fields | object | no | For `mapObject`: field mapping `{ "sourceField": "destField" }` |
| description | string | no | Human-readable transform expression (e.g., JS-like pseudocode) |
| destScope | string | no | GA4-specific: `"event_parameter"` (default) or `"user_property"`. Use when a user property is set only on specific events (e.g., setting `membership_tier` on login) rather than globally via `eventSettings` |

### Transform Types

**`direct`** (default) — Value passes through as-is, optionally renamed.
```json
{ "source": "value", "dest": "value" }
{ "source": "payment_method", "dest": "payment_type" }
```

**`pluck`** — Extract a single field from each item in an array, producing a flat array.
```json
{
  "source": "items", "dest": "content_ids",
  "transform": "pluck", "field": "item_id",
  "description": "items.map(i => i.item_id)"
}
```
Input: `[{item_id: "A", price: 10}, {item_id: "B", price: 20}]`
Output: `["A", "B"]`

**`mapObject`** — Transform an array of objects by remapping field names.
```json
{
  "source": "items", "dest": "contents",
  "transform": "mapObject",
  "fields": {
    "item_id": "id",
    "item_name": "name",
    "price": "item_price",
    "quantity": "quantity"
  },
  "description": "items.map(i => ({ id: i.item_id, name: i.item_name, ... }))"
}
```
Input: `[{item_id: "A", item_name: "Shoe", price: 10, quantity: 1}]`
Output: `[{id: "A", name: "Shoe", item_price: 10, quantity: 1}]`

The `description` field is optional but recommended for complex transforms — it serves as documentation and can be used by deploy tools to generate the actual transformation code (e.g., Custom JavaScript variables in GTM).

---

## Cross-Reference Views

The schema supports generating these views from the data:

### Parameter Usage Table

For each parameter, list which events reference it:

| Parameter | Type | Scope | Origin | Used in Events |
|-|-|-|-|-|
| cta_id | string | event | dom | cta_click, form_submit |
| currency | string | event | backend | view_item, add_to_cart, begin_checkout, purchase |
| user_id | string | global | backend | (all events) |

### Implementation Matrix

For each event + trigger, list expected parameter values:

| Event | Trigger | Parameter Values |
|-|-|-|
| form_submit | Contact form | form_id=`contact-form`, form_name=`Contact Us` |
| form_submit | Newsletter | form_id=`newsletter`, form_name=`Newsletter` |

### Destination Mapping Matrix

For each source event, show how it maps across destinations:

| Source Event | GA4 | Meta CAPI |
|-|-|-|
| purchase | purchase | Purchase |
| add_to_cart | add_to_cart | AddToCart |
| form_submit | generate_lead | Lead |

---

## Skill Pipeline

| Skill | Input | Output |
|-|-|-|
| `/plan` | URL or description | `.measurement/plans/<slug>.md` |
| `/plan-to-spec` | `.measurement/plans/<slug>.md` | `.measurement/spec/<slug>.json` |
| `/deploy-gtm` | `.measurement/spec/<slug>.json` | GTM workspace |

### Optional SaaS Sync

If `MA_API_URL` and `MA_API_KEY` are set, any skill can optionally sync the spec to the Measurement Assistant web app for UI-based review and collaboration.
