# E-commerce Measurement Plan

## Overview

- **Site type:** E-commerce
- **Business context:** _Describe the business, products/services, and target audience_
- **Key objectives:** _What business questions should measurement answer?_

## Events

### Page & Navigation

| Event | Trigger | Description |
|-|-|-|
| page_view | Every page load | Standard pageview with page metadata |

### Product Discovery

| Event | Trigger | Description |
|-|-|-|
| view_item_list | Category/search results page load | User views a list of products |
| select_item | Product click from list | User clicks a product from a listing |
| view_item | Product detail page load | User views a product detail page |
| view_promotion | Promo banner in viewport | User sees a promotional banner |
| select_promotion | Promo banner click | User clicks a promotional banner |

### Cart & Checkout

| Event | Trigger | Description |
|-|-|-|
| add_to_cart | Add to cart button click | Product added to cart |
| remove_from_cart | Remove button click in cart | Product removed from cart |
| view_cart | Cart page load | User views their cart |
| begin_checkout | Checkout page load | User starts checkout flow |
| add_shipping_info | Shipping step completed | User submits shipping details |
| add_payment_info | Payment step completed | User submits payment details |
| purchase | Order confirmation page load | Transaction completed |
| refund | Backend event | Order refunded (full or partial) |

### User Account

| Event | Trigger | Description |
|-|-|-|
| login | Successful login | User logs in |
| sign_up | Account creation | New user registration |

### Engagement

| Event | Trigger | Description |
|-|-|-|
| search | Search submission | User searches the site |
| share | Share button click | User shares a product/page |
| add_to_wishlist | Wishlist button click | User saves a product |

## Parameters

### Item Parameters (used across product events)

| Parameter | Type | Required | Description | Example |
|-|-|-|-|-|
| item_id | string | yes | Product SKU/ID | "SKU-12345" |
| item_name | string | yes | Product name | "Running Shoes Pro" |
| price | number | yes | Unit price | 129.99 |
| currency | string | yes | ISO 4217 currency | "USD" |
| item_category | string | no | Primary category | "Footwear" |
| item_category2 | string | no | Sub-category | "Running" |
| item_brand | string | no | Brand name | "Nike" |
| item_variant | string | no | Variant (size/color) | "Blue / Size 10" |
| quantity | number | no | Quantity | 1 |
| index | number | no | Position in list | 3 |
| item_list_name | string | no | List context | "Search Results" |

### Transaction Parameters (purchase, refund)

| Parameter | Type | Required | Description | Example |
|-|-|-|-|-|
| transaction_id | string | yes | Unique order ID | "ORD-2024-001" |
| value | number | yes | Total order value | 259.98 |
| currency | string | yes | ISO 4217 currency | "USD" |
| tax | number | no | Tax amount | 21.50 |
| shipping | number | no | Shipping cost | 5.99 |
| coupon | string | no | Applied coupon code | "SAVE10" |
| items | array | yes | Array of item objects | _see item params_ |

### Promotion Parameters

| Parameter | Type | Required | Description | Example |
|-|-|-|-|-|
| promotion_id | string | no | Promo identifier | "summer-sale-2024" |
| promotion_name | string | no | Promo display name | "Summer Sale" |
| creative_name | string | no | Creative variant | "hero-banner-v2" |
| creative_slot | string | no | Placement | "homepage_hero" |

## Implementation Notes

- All monetary values should be numeric (not strings), without currency symbols
- Currency must be consistent across all events in a session
- The `items` array must be present in all product-related events
- `transaction_id` must be unique per order — use it for deduplication
- Implement `refund` as a server-side event when possible
- Product list events (view_item_list, select_item) should include `item_list_name` for list context
