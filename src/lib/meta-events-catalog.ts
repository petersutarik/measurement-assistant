/**
 * Meta (Facebook) Pixel Standard Events Catalog
 *
 * Source: https://developers.facebook.com/docs/meta-pixel/reference
 * Last verified: 2026-03-24
 */

export interface MetaParameter {
  name: string;
  type: "string" | "number" | "string[]" | "object[]";
  required: boolean;
  /** Some params are conditionally required (e.g. currency required when value is set) */
  requiredIf?: string;
  description: string;
  example?: string | number | string[];
}

export interface MetaEvent {
  name: string;
  description: string;
  category: MetaEventCategory;
  verticals: MetaVertical[];
  parameters: MetaParameter[];
}

export type MetaEventCategory =
  | "ecommerce"
  | "lead_generation"
  | "content_engagement"
  | "subscription"
  | "auto";

export type MetaVertical =
  | "all"
  | "ecommerce"
  | "retail"
  | "lead_gen"
  | "saas"
  | "media"
  | "travel"
  | "nonprofit";

// ---------------------------------------------------------------------------
// Shared parameter sets
// ---------------------------------------------------------------------------

const CONTENT_PARAMS: MetaParameter[] = [
  { name: "content_ids", type: "string[]", required: false, description: "Product IDs associated with the event, e.g. SKUs.", example: ["ABC123", "DEF456"] },
  { name: "content_name", type: "string", required: false, description: "Name of the page or product.", example: "Leather Bag" },
  { name: "content_type", type: "string", required: false, description: "Content type, e.g. 'product' or 'product_group'.", example: "product" },
  { name: "content_category", type: "string", required: false, description: "Category of the page or product.", example: "Accessories" },
  { name: "contents", type: "object[]", required: false, description: "Array of objects with id, quantity, and optionally item_price.", example: "[{id: 'ABC123', quantity: 2, item_price: 5.99}]" as unknown as string },
];

const VALUE_PARAMS: MetaParameter[] = [
  { name: "currency", type: "string", required: false, requiredIf: "value is set", description: "Currency for the value specified, in ISO 4217 format.", example: "USD" },
  { name: "value", type: "number", required: false, requiredIf: "currency is set", description: "The monetary value of the event.", example: 30.0 },
];

// Helper to build content + value parameter sets
function contentValueParams(extra: MetaParameter[] = []): MetaParameter[] {
  return [
    ...CONTENT_PARAMS,
    ...VALUE_PARAMS,
    ...extra,
  ];
}

// ---------------------------------------------------------------------------
// Events catalog
// ---------------------------------------------------------------------------

export const META_EVENTS_CATALOG: MetaEvent[] = [
  // ===== AUTO =====
  {
    name: "PageView",
    description: "Tracked when a person lands on a page. Automatically fired by the Meta Pixel base code.",
    category: "auto",
    verticals: ["all"],
    parameters: [],
  },

  // ===== E-COMMERCE =====
  {
    name: "ViewContent",
    description: "Tracked when a person views a key page such as a product page. Helps understand which content is being viewed.",
    category: "ecommerce",
    verticals: ["ecommerce", "retail", "travel", "media"],
    parameters: contentValueParams(),
  },
  {
    name: "AddToCart",
    description: "Tracked when a product is added to the shopping cart.",
    category: "ecommerce",
    verticals: ["ecommerce", "retail", "travel"],
    parameters: contentValueParams(),
  },
  {
    name: "AddToWishlist",
    description: "Tracked when a product is added to a wishlist.",
    category: "ecommerce",
    verticals: ["ecommerce", "retail"],
    parameters: contentValueParams(),
  },
  {
    name: "InitiateCheckout",
    description: "Tracked when a person enters the checkout flow prior to completing the checkout.",
    category: "ecommerce",
    verticals: ["ecommerce", "retail", "travel"],
    parameters: contentValueParams([
      { name: "num_items", type: "number", required: false, description: "The number of items in the cart at checkout initiation.", example: 4 },
    ]),
  },
  {
    name: "AddPaymentInfo",
    description: "Tracked when payment information is added during the checkout flow.",
    category: "ecommerce",
    verticals: ["ecommerce", "retail", "travel"],
    parameters: contentValueParams(),
  },
  {
    name: "Purchase",
    description: "Tracked when a purchase is made or checkout flow is completed.",
    category: "ecommerce",
    verticals: ["ecommerce", "retail", "travel", "saas"],
    parameters: [
      ...CONTENT_PARAMS,
      { name: "currency", type: "string", required: true, description: "Currency for the value specified, in ISO 4217 format.", example: "USD" },
      { name: "value", type: "number", required: true, description: "The total monetary value of the purchase.", example: 59.99 },
      { name: "num_items", type: "number", required: false, description: "The number of items purchased.", example: 3 },
    ],
  },

  // ===== CONTENT ENGAGEMENT =====
  {
    name: "Search",
    description: "Tracked when a search is made on the website.",
    category: "content_engagement",
    verticals: ["all"],
    parameters: [
      ...CONTENT_PARAMS,
      ...VALUE_PARAMS,
      { name: "search_string", type: "string", required: false, description: "The string entered by the user for the search.", example: "leather bags" },
    ],
  },
  {
    name: "CustomizeProduct",
    description: "Tracked when a product is customized through a configuration tool or other application.",
    category: "content_engagement",
    verticals: ["ecommerce", "retail"],
    parameters: contentValueParams(),
  },
  {
    name: "FindLocation",
    description: "Tracked when a person searches for a location of a store, dealer, or affiliate via a website or app.",
    category: "content_engagement",
    verticals: ["retail", "travel"],
    parameters: contentValueParams(),
  },
  {
    name: "Contact",
    description: "Tracked when a person initiates contact with the business via telephone, SMS, email, chat, etc.",
    category: "lead_generation",
    verticals: ["all"],
    parameters: [],
  },

  // ===== LEAD GENERATION =====
  {
    name: "Lead",
    description: "Tracked when a sign-up is completed, such as a form submission indicating interest in a product.",
    category: "lead_generation",
    verticals: ["lead_gen", "saas", "all"],
    parameters: contentValueParams(),
  },
  {
    name: "CompleteRegistration",
    description: "Tracked when a registration form is completed, such as sign-up for a service.",
    category: "lead_generation",
    verticals: ["all"],
    parameters: contentValueParams([
      { name: "status", type: "string", required: false, description: "The status of the registration.", example: "complete" },
    ]),
  },
  {
    name: "SubmitApplication",
    description: "Tracked when a person submits an application for a product, service, or program.",
    category: "lead_generation",
    verticals: ["lead_gen", "saas"],
    parameters: contentValueParams(),
  },
  {
    name: "Schedule",
    description: "Tracked when a person books an appointment to visit a location.",
    category: "lead_generation",
    verticals: ["lead_gen", "retail", "travel"],
    parameters: contentValueParams(),
  },

  // ===== SUBSCRIPTION =====
  {
    name: "StartTrial",
    description: "Tracked when a person starts a free trial of a product or service.",
    category: "subscription",
    verticals: ["saas"],
    parameters: [
      ...VALUE_PARAMS,
      { name: "predicted_ltv", type: "number", required: false, description: "The predicted lifetime value of a subscriber.", example: 432.0 },
    ],
  },
  {
    name: "Subscribe",
    description: "Tracked when a person subscribes to a paid product or service.",
    category: "subscription",
    verticals: ["saas", "media"],
    parameters: [
      ...VALUE_PARAMS,
      { name: "predicted_ltv", type: "number", required: false, description: "The predicted lifetime value of a subscriber.", example: 432.0 },
    ],
  },

  // ===== NONPROFIT =====
  {
    name: "Donate",
    description: "Tracked when a person makes a donation.",
    category: "content_engagement",
    verticals: ["nonprofit"],
    parameters: VALUE_PARAMS,
  },
];

/**
 * Shared content parameters used across most Meta Pixel events.
 * Includes content_ids, content_name, content_type, content_category, and contents.
 */
export const META_CONTENT_PARAMETERS = CONTENT_PARAMS;
