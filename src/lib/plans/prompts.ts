// ── System prompt: concise role + interface mechanics ──────────────
export const PLAN_SYSTEM_PROMPT = `You are a measurement planning expert. You help users create marketing measurement plans that bridge business objectives to dataLayer implementation.

## Interface
- Split view: chat (left), plan document (right)
- Update the document by including a <document> tag with the full updated markdown
- The user can highlight document text and send it as context
- Build incrementally — strategy sections first, then events and parameters

## Conversation approach
1. Understand the business — ask about the site/app, business model, audience, what success looks like
2. Define objectives & KPIs — 2-4 business objectives, each with measurable goals, KPIs, and targets
3. Build the measurement matrix — map each KPI to the events and data required. This is the critical bridge
4. Specify events and parameters — grouped by category, every event tied to a KPI
5. Add platform notes and prioritize implementation

Start with the "why" (objectives, KPIs) before the "what" (events, parameters). If an event doesn't support a KPI, question whether it's needed.

## Response format
1. Conversational message (explanation, questions, suggestions)
2. If the document should change, include the full updated document in <document>...</document> tags. Omit if just discussing.

## Technical conventions
- Use standard GA4 event names where applicable (page_view, purchase, add_to_cart, generate_lead, etc.)
- snake_case for all custom events and parameters
- If the user doesn't know current KPI values, use "TBD" and help set reasonable targets
- Suggest useful segments (device, traffic source, user type, geography)`;

// ── Reference example: teaches format, depth, and thinking ────────
// This is injected as context so the AI learns by example, not by rules.
export const PLAN_REFERENCE_EXAMPLE = `
## Reference: Complete measurement plan example

Below is a fully worked example for a mid-size e-commerce site. Use it as a reference for structure, depth, and how to connect strategy to implementation. Adapt to the user's actual business — don't copy blindly.

---

# Measurement Plan — GreenLeaf Outdoor

## Overview

- **Site type:** E-commerce (DTC)
- **Business context:** GreenLeaf sells sustainable outdoor gear directly to consumers. Primary audience is environmentally-conscious outdoor enthusiasts aged 25-45. Revenue comes from one-time purchases with growing subscription box business.
- **Analytics stack:** GA4, GTM (web), Shopify, Google Ads, Meta Ads, Klaviyo (email/SMS)
- **Key business objectives:**
  1. Grow online revenue by 30% YoY
  2. Improve marketing efficiency (lower blended CPA)
  3. Increase repeat purchase rate

## Business Objectives & KPIs

### Objective 1: Grow online revenue by 30% YoY

| Goal | KPI | Current | Target | Key Segments |
|-|-|-|-|-|
| Increase conversion rate | Purchase conversion rate | 2.1% | 2.8% | Device, traffic source, new vs returning |
| Increase AOV | Average order value | $85 | $100 | Product category, coupon usage |
| Reduce checkout abandonment | Checkout completion rate | 42% | 55% | Device, payment method |

### Objective 2: Improve marketing efficiency

| Goal | KPI | Current | Target | Key Segments |
|-|-|-|-|-|
| Lower acquisition cost | Blended CPA | $45 | $35 | Channel, campaign type |
| Improve ROAS on paid | ROAS (Google/Meta) | 3.2x | 4.5x | Platform, campaign, audience |
| Identify best channels | Revenue by channel | TBD | TBD | Channel, first-touch vs last-touch |

### Objective 3: Increase repeat purchase rate

| Goal | KPI | Current | Target | Key Segments |
|-|-|-|-|-|
| Drive second purchases | Repeat purchase rate (90d) | 15% | 25% | Product category, acquisition channel |
| Grow subscription signups | Subscription conversion rate | 1.2% | 3% | Traffic source, landing page |

## Measurement Matrix

| KPI | Required Data | Event(s) | Key Parameters |
|-|-|-|-|
| Purchase conversion rate | Sessions + purchases | session_start, purchase | traffic_source, device, value |
| Average order value | Transaction totals | purchase | value, items, item_count |
| Checkout completion rate | Checkout starts vs completions | begin_checkout, purchase | value, items, coupon |
| Blended CPA | Ad spend (external) + conversions | purchase, generate_lead | transaction_id, value, currency |
| ROAS | Ad spend + revenue by source | purchase | value, traffic_source, campaign |
| Revenue by channel | Revenue attributed to channels | purchase | source, medium, campaign |
| Repeat purchase rate | User purchase frequency | purchase, login | user_id, customer_type (new/returning) |
| Subscription conversion rate | Sub page views + sub starts | view_item, subscribe | plan_type, value |

## Events

### E-commerce — Core Funnel

| Event | Trigger | Description | Tied to KPI |
|-|-|-|-|
| view_item_list | Category/search results page loads | User browses product listings | Purchase conversion rate |
| view_item | Product detail page loads | User views a specific product | Purchase conversion rate |
| add_to_cart | Click "Add to Cart" button | Item added to cart | Purchase conversion rate, AOV |
| remove_from_cart | Click remove in cart | Item removed from cart | Checkout completion rate |
| view_cart | Cart page/drawer opens | User reviews cart | Checkout completion rate |
| begin_checkout | Checkout page loads | User starts checkout | Checkout completion rate |
| add_shipping_info | Shipping step completed | User selects shipping method | Checkout completion rate |
| add_payment_info | Payment step completed | User enters payment details | Checkout completion rate |
| purchase | Order confirmation page | Completed transaction | All revenue KPIs |

### E-commerce — Discovery

| Event | Trigger | Description | Tied to KPI |
|-|-|-|-|
| search | Search executed | User searches for products | Purchase conversion rate |
| select_item | Click product from list | User selects product from listing | Purchase conversion rate |
| select_promotion | Click promotional banner | User engages with promotion | AOV, ROAS |
| view_promotion | Promotional banner in viewport | Promotion impression | ROAS |

### Engagement & Retention

| Event | Trigger | Description | Tied to KPI |
|-|-|-|-|
| login | Successful login | User authenticates | Repeat purchase rate |
| sign_up | Account creation | New account created | Repeat purchase rate |
| subscribe | Subscription box signup | User starts subscription | Subscription conversion rate |
| email_signup | Newsletter form submit | Email capture | Repeat purchase rate |
| wishlist_add | Click "Add to Wishlist" | User saves item for later | Repeat purchase rate |

### Content & Education

| Event | Trigger | Description | Tied to KPI |
|-|-|-|-|
| blog_read | Scroll >50% on blog post | User engages with content | Revenue by channel (content attribution) |
| sustainability_page_view | Sustainability page loads | User views brand values content | Purchase conversion rate (brand affinity) |

## Parameters

### Transaction Parameters

| Parameter | Type | Required | Description | Example |
|-|-|-|-|-|
| transaction_id | string | yes | Unique order ID | "GLS-20240315-4821" |
| value | number | yes | Total transaction value | 129.99 |
| currency | string | yes | ISO 4217 currency code | "USD" |
| tax | number | no | Tax amount | 10.40 |
| shipping | number | no | Shipping cost | 5.99 |
| coupon | string | no | Order-level coupon code | "SPRING20" |
| items | array | yes | Array of item objects | (see Item Parameters) |

### Item Parameters

| Parameter | Type | Required | Description | Example |
|-|-|-|-|-|
| item_id | string | yes | Product SKU | "GL-JACKET-042" |
| item_name | string | yes | Product name | "Alpine Recycled Down Jacket" |
| item_category | string | yes | Primary category | "Jackets" |
| item_category2 | string | no | Sub-category | "Down Jackets" |
| item_brand | string | no | Brand name | "GreenLeaf" |
| price | number | yes | Unit price | 189.00 |
| quantity | number | yes | Quantity | 1 |
| discount | number | no | Discount amount per unit | 37.80 |
| coupon | string | no | Item-level coupon | "JACKET10" |
| item_variant | string | no | Size/color variant | "M / Forest Green" |
| item_list_name | string | no | List where item was shown | "Category - Jackets" |
| index | number | no | Position in list | 3 |

### User & Session Parameters

| Parameter | Type | Required | Description | Example |
|-|-|-|-|-|
| customer_type | string | no | New vs returning customer | "returning" |
| user_id | string | no | Hashed user identifier | "usr_a8f3c1" |
| login_method | string | no | How user authenticated | "email" |

### Lead & Subscription Parameters

| Parameter | Type | Required | Description | Example |
|-|-|-|-|-|
| form_name | string | yes | Which form was submitted | "footer_newsletter" |
| plan_type | string | no | Subscription plan selected | "monthly_essentials" |
| lead_source | string | no | Where the signup happened | "blog_sidebar" |

## Channel & Platform Notes

- **UTM conventions:** \`utm_source/utm_medium/utm_campaign/utm_content/utm_term\` — enforce naming convention: \`{platform}_{campaign-type}_{audience}_{creative-variant}\`
- **Google Ads:** Auto-tagging enabled (GCLID). Enhanced conversions configured for purchase and subscribe events
- **Meta Ads:** Conversions API (server-side) for purchase, add_to_cart, and subscribe events to improve signal quality
- **Klaviyo:** Pass email_signup and purchase events via server-side integration for flow attribution
- **Cross-domain:** None needed (single domain on Shopify)
- **Consent:** Google Consent Mode v2 with default deny for analytics/ad storage in EU. Cookiebot CMP integration

## Implementation Priorities

### Phase 1 — Foundation (Week 1-2)
- GA4 + GTM base setup with Consent Mode v2
- Core e-commerce funnel: view_item_list through purchase
- Transaction and item parameters (full GA4 e-commerce spec)
- Google Ads enhanced conversions

### Phase 2 — Enhancement (Week 3-4)
- Discovery events: search, select_item, promotions
- Engagement events: login, sign_up, email_signup, wishlist_add
- User parameters: customer_type, user_id
- Meta Conversions API setup
- Klaviyo server-side integration

### Phase 3 — Advanced (Week 5+)
- Content engagement events: blog_read, sustainability_page_view
- Subscription tracking: subscribe event + plan_type parameter
- Custom audience building in GA4 based on engagement signals
- Cross-platform attribution reporting setup

---`;
