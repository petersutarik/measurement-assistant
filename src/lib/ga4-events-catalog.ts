/**
 * GA4 Recommended Events Catalog
 *
 * Source: https://developers.google.com/analytics/devguides/collection/ga4/reference/events
 * Last verified: 2026-03-24
 */

export type GA4ParamScope =
  | "default"
  | "custom_dimension"
  | "custom_metric"
  | "user_property";

export interface GA4Parameter {
  name: string;
  type: "string" | "number" | "boolean" | "items";
  required: boolean;
  /** Some params are conditionally required (e.g. currency required when value is set) */
  requiredIf?: string;
  description: string;
  example?: string | number | boolean;
  /** How this parameter is registered in GA4 */
  scope: GA4ParamScope;
}

export interface GA4Event {
  name: string;
  description: string;
  category: GA4EventCategory;
  verticals: GA4Vertical[];
  parameters: GA4Parameter[];
}

export type GA4EventCategory =
  | "auto"
  | "ecommerce"
  | "lead_generation"
  | "content_engagement"
  | "gaming"
  | "onboarding";

export type GA4Vertical =
  | "all"
  | "ecommerce"
  | "retail"
  | "lead_gen"
  | "saas"
  | "media"
  | "gaming"
  | "travel";

// ---------------------------------------------------------------------------
// Shared parameter sets
// ---------------------------------------------------------------------------

const ITEM_PARAMS: GA4Parameter[] = [
  { name: "item_id", type: "string", required: true, scope: "default", description: "ID of the item. One of item_id or item_name is required.", example: "SKU_12345" },
  { name: "item_name", type: "string", required: true, scope: "default", description: "Name of the item. One of item_id or item_name is required.", example: "Stan and Friends Tee" },
  { name: "affiliation", type: "string", required: false, scope: "default", description: "A product affiliation to designate a supplying company or brick and mortar store location.", example: "Google Merchandise Store" },
  { name: "coupon", type: "string", required: false, scope: "default", description: "The coupon name/code associated with the item.", example: "SUMMER_FUN" },
  { name: "discount", type: "number", required: false, scope: "default", description: "The unit monetary discount value associated with the item.", example: 2.22 },
  { name: "index", type: "number", required: false, scope: "default", description: "The index/position of the item in a list.", example: 5 },
  { name: "item_brand", type: "string", required: false, scope: "default", description: "The brand of the item.", example: "Google" },
  { name: "item_category", type: "string", required: false, scope: "default", description: "The category of the item (1st level).", example: "Apparel" },
  { name: "item_category2", type: "string", required: false, scope: "default", description: "The 2nd category hierarchy of the item.", example: "Adult" },
  { name: "item_category3", type: "string", required: false, scope: "default", description: "The 3rd category hierarchy of the item.", example: "Shirts" },
  { name: "item_category4", type: "string", required: false, scope: "default", description: "The 4th category hierarchy of the item.", example: "Crew" },
  { name: "item_category5", type: "string", required: false, scope: "default", description: "The 5th category hierarchy of the item.", example: "Short sleeve" },
  { name: "item_list_id", type: "string", required: false, scope: "default", description: "The ID of the list in which the item was presented to the user.", example: "related_products" },
  { name: "item_list_name", type: "string", required: false, scope: "default", description: "The name of the list in which the item was presented to the user.", example: "Related products" },
  { name: "item_variant", type: "string", required: false, scope: "default", description: "The item variant or unique code or description for additional item details/options.", example: "green" },
  { name: "location_id", type: "string", required: false, scope: "default", description: "The physical location associated with the item (e.g. the physical store location). Use the Google Place ID.", example: "ChIJIQBpAG2ahYAR_6128GcTUEo" },
  { name: "price", type: "number", required: false, scope: "default", description: "The monetary price of the item, in units of the specified currency parameter.", example: 9.99 },
  { name: "quantity", type: "number", required: false, scope: "default", description: "Item quantity.", example: 1 },
];

const PROMO_ITEM_PARAMS: GA4Parameter[] = [
  ...ITEM_PARAMS,
  { name: "creative_name", type: "string", required: false, scope: "default", description: "The name of a creative used in a promotional spot.", example: "summer_banner2" },
  { name: "creative_slot", type: "string", required: false, scope: "default", description: "The name of a creative slot.", example: "featured_app_1" },
  { name: "promotion_id", type: "string", required: false, scope: "default", description: "The ID of a product promotion.", example: "P_12345" },
  { name: "promotion_name", type: "string", required: false, scope: "default", description: "The name of a product promotion.", example: "Summer Sale" },
];

// Helper to create currency+value+items parameter sets
function ecommerceEventParams(extra: GA4Parameter[] = []): GA4Parameter[] {
  return [
    { name: "currency", type: "string", required: false, requiredIf: "value is set", scope: "default", description: "Currency of the items associated with the event, in 3-letter ISO 4217 format.", example: "USD" },
    { name: "value", type: "number", required: false, requiredIf: "currency is set", scope: "default", description: "The monetary value of the event. Set to the sum of (price * quantity) for all items.", example: 30.03 },
    ...extra,
    { name: "items", type: "items", required: true, scope: "default", description: "The items for the event. Array of item objects." },
  ];
}

// ---------------------------------------------------------------------------
// Events catalog
// ---------------------------------------------------------------------------

export const GA4_EVENTS_CATALOG: GA4Event[] = [
  // ===== AUTOMATICALLY COLLECTED (key ones) =====
  {
    name: "page_view",
    description: "Logged each time a new page is loaded or the browser history state is changed by the active site. Collected automatically by default.",
    category: "auto",
    verticals: ["all"],
    parameters: [
      { name: "page_location", type: "string", required: false, scope: "default", description: "The URL of the page.", example: "https://example.com/about" },
      { name: "page_referrer", type: "string", required: false, scope: "default", description: "The URL of the previous page.", example: "https://example.com/" },
      { name: "page_title", type: "string", required: false, scope: "default", description: "The title of the page.", example: "About Us" },
    ],
  },
  {
    name: "first_visit",
    description: "Logged the first time a user visits a website or launches an app. No parameters needed — automatically collected.",
    category: "auto",
    verticals: ["all"],
    parameters: [],
  },
  {
    name: "session_start",
    description: "Logged when a user engages the app or website. A session starts when a user opens the app or views a page/screen and no session is currently active.",
    category: "auto",
    verticals: ["all"],
    parameters: [],
  },
  {
    name: "user_engagement",
    description: "Logged periodically when the app is in the foreground or a web page is in focus for at least one second.",
    category: "auto",
    verticals: ["all"],
    parameters: [
      { name: "engagement_time_msec", type: "number", required: false, scope: "default", description: "The engagement time in milliseconds.", example: 3521 },
    ],
  },

  // ===== E-COMMERCE =====
  {
    name: "view_item_list",
    description: "Log this event when the user has been presented with a list of items of a certain category.",
    category: "ecommerce",
    verticals: ["ecommerce", "retail", "travel"],
    parameters: [
      { name: "item_list_id", type: "string", required: false, scope: "default", description: "The ID of the list in which the items were presented to the user.", example: "related_products" },
      { name: "item_list_name", type: "string", required: false, scope: "default", description: "The name of the list in which the items were presented to the user.", example: "Related products" },
      { name: "items", type: "items", required: true, scope: "default", description: "The items for the event. Array of item objects." },
    ],
  },
  {
    name: "select_item",
    description: "Signifies an item was selected from a list.",
    category: "ecommerce",
    verticals: ["ecommerce", "retail", "travel"],
    parameters: [
      { name: "item_list_id", type: "string", required: false, scope: "default", description: "The ID of the list in which the item was presented to the user.", example: "related_products" },
      { name: "item_list_name", type: "string", required: false, scope: "default", description: "The name of the list in which the item was presented to the user.", example: "Related products" },
      { name: "items", type: "items", required: true, scope: "default", description: "The items for the event. Expects a single-element array." },
    ],
  },
  {
    name: "view_item",
    description: "This event signifies that some content was shown to the user. Use this to discover the most popular items viewed.",
    category: "ecommerce",
    verticals: ["ecommerce", "retail", "travel"],
    parameters: ecommerceEventParams(),
  },
  {
    name: "add_to_wishlist",
    description: "Signifies that an item was added to a wishlist. Use it to identify popular gift items.",
    category: "ecommerce",
    verticals: ["ecommerce", "retail"],
    parameters: ecommerceEventParams(),
  },
  {
    name: "add_to_cart",
    description: "Signifies that an item was added to a cart for purchase.",
    category: "ecommerce",
    verticals: ["ecommerce", "retail", "travel"],
    parameters: ecommerceEventParams(),
  },
  {
    name: "remove_from_cart",
    description: "Signifies that an item was removed from a cart.",
    category: "ecommerce",
    verticals: ["ecommerce", "retail", "travel"],
    parameters: ecommerceEventParams(),
  },
  {
    name: "view_cart",
    description: "Signifies that a user viewed their cart.",
    category: "ecommerce",
    verticals: ["ecommerce", "retail"],
    parameters: ecommerceEventParams(),
  },
  {
    name: "begin_checkout",
    description: "Signifies that a user has begun a checkout.",
    category: "ecommerce",
    verticals: ["ecommerce", "retail", "travel"],
    parameters: ecommerceEventParams([
      { name: "coupon", type: "string", required: false, scope: "default", description: "The coupon name/code associated with the event.", example: "SUMMER_FUN" },
    ]),
  },
  {
    name: "add_shipping_info",
    description: "Signifies a user has submitted their shipping information during checkout.",
    category: "ecommerce",
    verticals: ["ecommerce", "retail"],
    parameters: ecommerceEventParams([
      { name: "coupon", type: "string", required: false, scope: "default", description: "The coupon name/code associated with the event.", example: "SUMMER_FUN" },
      { name: "shipping_tier", type: "string", required: false, scope: "default", description: "The shipping tier (e.g. Ground, Air, Next-day) selected for delivery of the purchased item.", example: "Ground" },
    ]),
  },
  {
    name: "add_payment_info",
    description: "Signifies a user has submitted their payment information during checkout.",
    category: "ecommerce",
    verticals: ["ecommerce", "retail", "travel"],
    parameters: ecommerceEventParams([
      { name: "coupon", type: "string", required: false, scope: "default", description: "The coupon name/code associated with the event.", example: "SUMMER_FUN" },
      { name: "payment_type", type: "string", required: false, scope: "default", description: "The chosen method of payment.", example: "credit_card" },
    ]),
  },
  {
    name: "purchase",
    description: "Signifies when one or more items is purchased by a user.",
    category: "ecommerce",
    verticals: ["ecommerce", "retail", "travel", "saas"],
    parameters: ecommerceEventParams([
      { name: "transaction_id", type: "string", required: true, scope: "default", description: "The unique identifier of a transaction.", example: "T_12345" },
      { name: "coupon", type: "string", required: false, scope: "default", description: "The coupon name/code associated with the event.", example: "SUMMER_FUN" },
      { name: "shipping", type: "number", required: false, scope: "default", description: "Shipping cost associated with a transaction.", example: 3.33 },
      { name: "tax", type: "number", required: false, scope: "default", description: "Tax cost associated with a transaction.", example: 1.11 },
    ]),
  },
  {
    name: "refund",
    description: "Signifies when a refund is issued. Use transaction_id to associate with original purchase.",
    category: "ecommerce",
    verticals: ["ecommerce", "retail", "travel", "saas"],
    parameters: [
      { name: "currency", type: "string", required: false, requiredIf: "value is set", scope: "default", description: "Currency in 3-letter ISO 4217 format.", example: "USD" },
      { name: "value", type: "number", required: false, requiredIf: "currency is set", scope: "default", description: "The monetary value of the event.", example: 30.03 },
      { name: "transaction_id", type: "string", required: true, scope: "default", description: "The unique identifier of the original transaction.", example: "T_12345" },
      { name: "coupon", type: "string", required: false, scope: "default", description: "The coupon name/code associated with the event.", example: "SUMMER_FUN" },
      { name: "shipping", type: "number", required: false, scope: "default", description: "Shipping cost associated with a transaction.", example: 3.33 },
      { name: "tax", type: "number", required: false, scope: "default", description: "Tax cost associated with a transaction.", example: 1.11 },
      { name: "items", type: "items", required: false, scope: "default", description: "Items being refunded. If omitted, full refund is assumed." },
    ],
  },

  // ===== PROMOTIONS =====
  {
    name: "view_promotion",
    description: "This event signifies a promotion was viewed from a list.",
    category: "ecommerce",
    verticals: ["ecommerce", "retail", "media"],
    parameters: [
      { name: "creative_name", type: "string", required: false, scope: "default", description: "The name of the promotional creative.", example: "summer_banner2" },
      { name: "creative_slot", type: "string", required: false, scope: "default", description: "The name of the promotional creative slot.", example: "featured_app_1" },
      { name: "promotion_id", type: "string", required: false, scope: "default", description: "The ID of the promotion associated with the event.", example: "P_12345" },
      { name: "promotion_name", type: "string", required: false, scope: "default", description: "The name of the promotion associated with the event.", example: "Summer Sale" },
      { name: "items", type: "items", required: false, scope: "default", description: "The items associated with the promotion." },
    ],
  },
  {
    name: "select_promotion",
    description: "This event signifies a promotion was selected/clicked from a list.",
    category: "ecommerce",
    verticals: ["ecommerce", "retail", "media"],
    parameters: [
      { name: "creative_name", type: "string", required: false, scope: "default", description: "The name of the promotional creative.", example: "summer_banner2" },
      { name: "creative_slot", type: "string", required: false, scope: "default", description: "The name of the promotional creative slot.", example: "featured_app_1" },
      { name: "promotion_id", type: "string", required: false, scope: "default", description: "The ID of the promotion associated with the event.", example: "P_12345" },
      { name: "promotion_name", type: "string", required: false, scope: "default", description: "The name of the promotion associated with the event.", example: "Summer Sale" },
      { name: "items", type: "items", required: false, scope: "default", description: "The items associated with the promotion." },
    ],
  },

  // ===== LEAD GENERATION =====
  {
    name: "generate_lead",
    description: "Log this event when a lead has been generated to understand the efficacy of your re-engagement campaigns.",
    category: "lead_generation",
    verticals: ["lead_gen", "saas", "all"],
    parameters: [
      { name: "currency", type: "string", required: false, requiredIf: "value is set", scope: "default", description: "Currency in 3-letter ISO 4217 format.", example: "USD" },
      { name: "value", type: "number", required: false, requiredIf: "currency is set", scope: "default", description: "The monetary value associated with the lead.", example: 99.99 },
    ],
  },
  {
    name: "sign_up",
    description: "Indicates that a user has signed up for an account. Use this to understand the popularity of each sign-up method.",
    category: "lead_generation",
    verticals: ["all"],
    parameters: [
      { name: "method", type: "string", required: false, scope: "default", description: "The method used for sign up.", example: "google" },
    ],
  },
  {
    name: "login",
    description: "Signify that a user has logged in to your website or app.",
    category: "lead_generation",
    verticals: ["all"],
    parameters: [
      { name: "method", type: "string", required: false, scope: "default", description: "The method used to login.", example: "google" },
    ],
  },

  // ===== CONTENT & ENGAGEMENT =====
  {
    name: "search",
    description: "Use this event to contextualize search operations. This can help identify the most popular content on your site.",
    category: "content_engagement",
    verticals: ["all"],
    parameters: [
      { name: "search_term", type: "string", required: true, scope: "default", description: "The term that was searched for.", example: "t-shirts" },
    ],
  },
  {
    name: "select_content",
    description: "Signifies that a user has selected some content of a certain type. Use this to identify popular content and categories.",
    category: "content_engagement",
    verticals: ["media", "saas", "all"],
    parameters: [
      { name: "content_type", type: "string", required: false, scope: "default", description: "The type of selected content.", example: "product" },
      { name: "content_id", type: "string", required: false, scope: "default", description: "An identifier for the selected content.", example: "C_12345" },
    ],
  },
  {
    name: "share",
    description: "Use this event when a user has shared content.",
    category: "content_engagement",
    verticals: ["media", "all"],
    parameters: [
      { name: "method", type: "string", required: false, scope: "default", description: "The method in which the content is shared.", example: "twitter" },
      { name: "content_type", type: "string", required: false, scope: "default", description: "The type of shared content.", example: "image" },
      { name: "item_id", type: "string", required: false, scope: "default", description: "The ID of the shared content.", example: "C_12345" },
    ],
  },
  {
    name: "join_group",
    description: "Log this event when a user joins a group such as a guild, team, or family. Helps analyze popularity of groups.",
    category: "content_engagement",
    verticals: ["gaming", "saas", "media"],
    parameters: [
      { name: "group_id", type: "string", required: false, scope: "default", description: "The ID of the group.", example: "G_12345" },
    ],
  },

  // ===== GAMING =====
  {
    name: "earn_virtual_currency",
    description: "Log this event when the user is awarded virtual currency in a game. Helps identify the most valuable virtual currencies.",
    category: "gaming",
    verticals: ["gaming"],
    parameters: [
      { name: "virtual_currency_name", type: "string", required: false, scope: "default", description: "The name of the virtual currency.", example: "gems" },
      { name: "value", type: "number", required: false, scope: "default", description: "The value of the virtual currency.", example: 5 },
    ],
  },
  {
    name: "spend_virtual_currency",
    description: "Log this event when the user spends virtual currency. Identifies the most popular items to buy.",
    category: "gaming",
    verticals: ["gaming"],
    parameters: [
      { name: "value", type: "number", required: true, scope: "default", description: "The value of the virtual currency.", example: 5 },
      { name: "virtual_currency_name", type: "string", required: true, scope: "default", description: "The name of the virtual currency.", example: "gems" },
      { name: "item_name", type: "string", required: false, scope: "default", description: "The name of the item the virtual currency is being used for.", example: "Starter Boost" },
    ],
  },
  {
    name: "level_up",
    description: "Signifies a player has leveled up in a game.",
    category: "gaming",
    verticals: ["gaming"],
    parameters: [
      { name: "level", type: "number", required: false, scope: "default", description: "The level of the character.", example: 5 },
      { name: "character", type: "string", required: false, scope: "default", description: "The character that leveled up.", example: "Player 1" },
    ],
  },
  {
    name: "level_start",
    description: "Signifies a player has started a level in a game.",
    category: "gaming",
    verticals: ["gaming"],
    parameters: [
      { name: "level_name", type: "string", required: false, scope: "default", description: "The name of the level.", example: "Level 5" },
    ],
  },
  {
    name: "level_end",
    description: "Signifies a player has ended/completed a level in a game.",
    category: "gaming",
    verticals: ["gaming"],
    parameters: [
      { name: "level_name", type: "string", required: false, scope: "default", description: "The name of the level.", example: "Level 5" },
      { name: "success", type: "boolean", required: false, scope: "default", description: "Whether the level was completed successfully.", example: true },
    ],
  },
  {
    name: "post_score",
    description: "Log this event when the user posts a score in a game.",
    category: "gaming",
    verticals: ["gaming"],
    parameters: [
      { name: "score", type: "number", required: true, scope: "default", description: "The score to post.", example: 10000 },
      { name: "level", type: "number", required: false, scope: "default", description: "The level for the score.", example: 5 },
      { name: "character", type: "string", required: false, scope: "default", description: "The character that achieved the score.", example: "Player 1" },
    ],
  },
  {
    name: "unlock_achievement",
    description: "Log this event when the user has unlocked an achievement.",
    category: "gaming",
    verticals: ["gaming"],
    parameters: [
      { name: "achievement_id", type: "string", required: true, scope: "default", description: "The ID of the achievement that was unlocked.", example: "A_12345" },
    ],
  },

  // ===== ONBOARDING / SAAS =====
  {
    name: "tutorial_begin",
    description: "Signifies the start of the user on-boarding process. Use to understand how many users start the tutorial/onboarding.",
    category: "onboarding",
    verticals: ["saas", "gaming", "all"],
    parameters: [],
  },
  {
    name: "tutorial_complete",
    description: "Signifies the user's completion of the on-boarding process. Use along with tutorial_begin to understand drop-off.",
    category: "onboarding",
    verticals: ["saas", "gaming", "all"],
    parameters: [],
  },
];

/**
 * Standard item parameters used by ecommerce events.
 * Events with `type: "items"` parameter accept an array of objects with these fields.
 */
export const GA4_ITEM_PARAMETERS = ITEM_PARAMS;

/**
 * Extended item parameters used by promotion events (view_promotion, select_promotion).
 * Includes all standard item params plus promotion-specific fields.
 */
export const GA4_PROMO_ITEM_PARAMETERS = PROMO_ITEM_PARAMS;
