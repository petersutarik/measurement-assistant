# Measurement Assistant — Data Model

A SaaS for documenting dataLayer implementations and marketing measurement plans. AI-first, agentic approach.

## Design Principles

1. **dataLayer is the source of truth** — platform-agnostic, documents what the website pushes
2. **Destinations are consumers** — GA4, Meta, Google Ads, Klaviyo, etc. each map from the dataLayer
3. **Define once, map everywhere** — one event definition generates configs for all destinations
4. **AI generates, human reviews** — agent crawls site, detects events, generates params; human approves

---

## Schema

### Layer 1: dataLayer (Source)

#### Events

What the site pushes to the dataLayer. One row per distinct `dataLayer.push()` call.

| Column | Type | Notes |
|-|-|-|
| event_name | text | `add_to_cart`, `generate_lead`, `virtual_pageview` |
| description | text | What triggers this, business context |
| category | select | `ecommerce`, `interaction`, `virtual_pageview`, `form` |
| trigger_type | select | `page_load`, `click`, `form_submit`, `scroll`, `custom_js` |
| page_pattern | text | URL pattern where it fires: `/producten/*`, `/afrekenen/*` |
| element_selector | text | CSS selector of trigger element: `.add-to-cart-btn` |
| code_example | text | Full `dataLayer.push()` snippet (can be auto-generated) |
| parameters | relation → Parameters | Which params this event pushes |
| ecommerce_event | bool | Does it carry an `ecommerce` object? |
| screenshot | image | Visual reference of where it fires on the site |
| implementation_doc | relation → Documents | Which doc section covers this |
| phase | relation → Phases | Implementation milestone |

#### Parameters

Every key that appears in any dataLayer push. Defined once, reused across events.

| Column | Type | Notes |
|-|-|-|
| key | text | `item_brand`, `search_term`, `value`, `currency` |
| scope | select | `event`, `ecommerce`, `item`, `user` |
| data_type | select | `string`, `decimal`, `integer`, `boolean`, `array` |
| description | text | Business meaning of this parameter |
| example_values | text | `"Technogym"`, `"3650.00"`, `"EUR"` |
| required | bool | Is this parameter required when the event fires? |
| events | relation → Events | Reverse: which events include this (calculated) |

**Scope definitions:**
- `event` — top-level key in the push (`event`, `search_term`, `value`)
- `ecommerce` — inside the `ecommerce` object but outside `items[]` (`ecommerce.currency`, `ecommerce.value`)
- `item` — inside `ecommerce.items[]` array (`item_name`, `item_brand`, `price`)
- `user` — user-level properties pushed separately (`user_id`, `membership_type`)

---

### Layer 2: Destinations (Consumers)

#### Destinations

The platforms consuming dataLayer data. One row per vendor/tool.

| Column | Type | Notes |
|-|-|-|
| name | text | `GA4`, `Meta CAPI`, `Google Ads`, `Klaviyo`, `Hotjar` |
| type | select | `analytics`, `advertising`, `crm`, `cdp`, `testing` |
| measurement_id | text | GA4: `G-XXXXXXX`, Meta: Pixel ID, etc. |
| gtm_tag_type | text | `GA4 Event`, `Meta Pixel`, `Custom HTML` |
| notes | text | Account details, setup notes |

#### Destination Events

How each dataLayer event maps to each destination. This is the **many-to-many** join between Events and Destinations.

| Column | Type | Notes |
|-|-|-|
| source_event | relation → Events | The dataLayer event triggering this |
| destination | relation → Destinations | Which platform receives it |
| destination_event_name | text | Often same as source, but can differ (`Purchase` in Meta vs `purchase` in GA4) |
| is_conversion | bool | Marked as conversion/key event in this destination? |
| event_category | text | Destination-specific grouping (e.g., GA4 event category) |
| gtm_tag_id | text | GTM tag reference |
| ecommerce_enabled | bool | GA4-specific: use built-in ecommerce? |
| parameter_mappings | relation → Destination Parameters | Which params are mapped |
| notes | text | Destination-specific config notes |
| qa_status | select | `pass`, `fail`, `pending`, `not_tested` |
| qa_notes | text | QA findings |
| qa_screenshot | image | Proof from destination's debug tool (GA4 DebugView, Meta Events Manager) |

#### Destination Parameters

How dataLayer parameters map to destination-specific fields. This is where `item_brand` becomes a GA4 custom dimension or a Meta custom data field.

| Column | Type | Notes |
|-|-|-|
| source_parameter | relation → Parameters | The dataLayer variable |
| destination | relation → Destinations | Which platform |
| destination_name | text | GA4: custom dimension name. Meta: `content_type`. Google Ads: parameter label |
| destination_scope | text | GA4: `Event dimension`, `User property`, `Item scope`. Meta: `custom_data` |
| needs_registration | bool | Must be created in destination admin? (GA4 custom dims need registration) |
| registered | bool | Has it been created in the destination? |
| notes | text | Mapping notes, transformations needed |

---

### Layer 3: Support Tables

#### Documents

Implementation guide sections. Events reference these to indicate which doc covers their setup.

| Column | Type | Notes |
|-|-|-|
| name | text | `Ecommerce Tracking`, `Consent Mode`, `Virtual Pageviews` |
| type | select | `implementation`, `reference`, `guide` |
| description | text | What this doc covers |
| events | relation → Events | Reverse: which events reference this doc (calculated) |

#### Phases

Implementation milestones for staged rollouts.

| Column | Type | Notes |
|-|-|-|
| name | text | `Phase 1: Basic Ecommerce`, `Phase 2: Lead Tracking` |
| status | select | `planned`, `in_progress`, `complete`, `qa` |
| target_date | date | Planned completion |
| events | relation → Events | Reverse: which events belong to this phase (calculated) |

#### Lookups

Static reference data:
- **Parameter Scopes**: `event`, `ecommerce`, `item`, `user`
- **Data Types**: `string`, `decimal`, `integer`, `boolean`, `array`
- **Trigger Types**: `page_load`, `click`, `form_submit`, `scroll`, `custom_js`
- **Event Categories**: `ecommerce`, `interaction`, `virtual_pageview`, `form`
- **Destination Types**: `analytics`, `advertising`, `crm`, `cdp`, `testing`
- **QA Statuses**: `pass`, `fail`, `pending`, `not_tested`

---

## Relationships

```
                 DATALAYER (source, platform-agnostic)
                ┌──────────────────────────────────────┐
                │                                      │
                │   Events ◄──────► Parameters         │
                │     │                                │
                │     ├──► Documents                   │
                │     └──► Phases                      │
                │                                      │
                └──────────┬──────────┬────────────────┘
                           │          │
            ┌──────────────┼──────────┼───────────────┐
            │       DESTINATIONS (consumers)           │
            │                                          │
            │   Destinations                           │
            │        │                                 │
            │   Dest Events                            │
            │     ├── source_event ──► Events          │
            │     ├── destination ──► Destinations     │
            │     └── parameter_mappings ──► Dest Params│
            │                                          │
            │   Dest Parameters                        │
            │     ├── source_parameter ──► Parameters   │
            │     └── destination ──► Destinations     │
            │                                          │
            └──────────────────────────────────────────┘
```

---

## Key Design Decisions

### Why separate dataLayer from destinations?

The dataLayer definition is **done once per site**. It describes reality: what the website pushes. Adding a new destination (e.g., switching from UA to GA4, adding Meta pixel) should NOT require touching the source layer. You just add Destination Events and Destination Parameters for the new vendor.

### Why Destination Events as a join table?

One dataLayer event can map to multiple destinations differently:
- `purchase` → GA4 `purchase` (ecommerce enabled, conversion) + Meta `Purchase` (custom data mapping) + Google Ads conversion
- `generate_lead` → GA4 `generate_lead` (conversion) + Meta `Lead` + LinkedIn Insight Tag

Each destination may name it differently, mark different events as conversions, and map parameters differently.

### Why Destination Parameters separate from Destination Events?

Parameters are reused across events within a destination. `item_brand` maps to the same GA4 custom dimension whether it comes from `view_item` or `add_to_cart`. Defining the mapping once per parameter per destination avoids repetition.

### Why scope on Parameters instead of dotted paths?

Instead of `ecommerce.items.item_brand` as the key (encoding hierarchy in a string), the key is just `item_brand` with scope `item`. Benefits:
- Query all item-level params without string parsing
- The item schema is clearly defined as all params where scope = `item`
- Works across platforms that structure data differently (Meta doesn't use `ecommerce.items`)

### Code examples should be generated, not hand-written

Given an event's parameters (grouped by scope) and their types, the `dataLayer.push()` code is deterministic:

```javascript
// Generated from: event=add_to_cart, params=[event(event,currency,value), item(item_id,item_name,price,item_brand,...)]
dataLayer.push({ ecommerce: null });
dataLayer.push({
  event: "add_to_cart",
  ecommerce: {
    currency: "EUR",         // string
    value: 3650.00,          // decimal
    items: [{
      item_id: "MNFCNN1",   // string
      item_name: "Technogym Selection 700 Chest Press", // string
      price: 3650.00,        // decimal
      item_brand: "Technogym" // string
    }]
  }
});
```

Store the structured data, render the code.

---

## AI Agent Pipeline

### 1. Site Scanner (automated discovery)

Input: URL
Process:
1. Crawl site with Firecrawl — discover all page types (home, category, product, cart, checkout, confirmation)
2. Detect platform (WooCommerce, Shopify, custom) from HTML signatures
3. Identify interactive elements (forms, CTAs, search, filters, chat widgets)
4. Take screenshots of key interaction points
5. Detect existing dataLayer pushes (if any)

Output: Draft Events table + Parameters table + Screenshots

### 2. Template Engine (smart defaults)

Based on detected platform and site type:
- **Ecommerce** → pre-populate standard GA4 ecommerce events (view_item_list through purchase)
- **Lead gen** → generate_lead, form_submit, phone_click, email_click
- **SaaS** → sign_up, login, feature_used, plan_selected, trial_started
- **Media** → article_view, scroll_depth, video_play, paywall_hit

Templates include default parameters, code examples, and destination mappings.

### 3. Destination Mapper (config generator)

Given Events + Parameters + selected Destinations:
- Auto-generate Destination Events (name mapping, conversion flags)
- Auto-generate Destination Parameters (GA4 custom dims, Meta custom data)
- Generate GTM container export (JSON)
- Generate GA4 admin setup checklist (which custom dimensions to create)

### 4. QA Agent (automated verification)

Visit site with Playwright, intercept dataLayer pushes:
1. Navigate to each page pattern defined in Events
2. Perform the trigger action (click element, submit form, scroll)
3. Capture the actual `dataLayer.push()` call
4. Compare against expected event + parameters
5. Update qa_status, qa_notes, qa_screenshot

---

## Comparison: Current Coda Setup vs Proposed

| Aspect | Current (Coda) | Proposed |
|-|-|-|
| Event tables | 2 (Custom Events + GA4 Events), barely connected | 1 Events table + Destination Events per vendor |
| Parameter hierarchy | Flat list with dotted paths (`ecommerce.items.item_brand`) | Structured scope (`item` + `item_brand`) |
| Adding a destination | Rebuild GA4-specific tables for new vendor | Add rows to Destinations, Dest Events, Dest Parameters |
| GA4 Custom Data | Separate disconnected table | Merged into Destination Parameters |
| GTM config | Mixed into Variables table | Separate in Destination Parameters |
| QA workflow | Bolted onto GA4 Events table | Per-destination QA on Destination Events |
| Implementation docs | Text string reference, breaks silently | Relation to Documents table |
| Code examples | Hand-written, can drift from params | Generated from structured event + parameter data |
| Multi-vendor support | Not possible without duplicating structure | Native — each destination is just more rows |
| AI automation | None — fully manual | Scanner, templates, mapper, QA agent |

---

## File Structure (this repo)

```
measurement-assistant/
├── DATA-MODEL.md          ← this file (schema design)
├── PRODUCT-SPEC.md        ← product requirements, user stories (TODO)
├── AGENT-ARCHITECTURE.md  ← AI agent pipeline design (TODO)
└── templates/             ← event/parameter templates per platform (TODO)
    ├── ecommerce-ga4.json
    ├── ecommerce-meta.json
    └── lead-gen-ga4.json
```
