# Lead Generation Measurement Plan

## Overview

- **Site type:** Lead Generation
- **Business context:** _Describe the business, services, and target audience_
- **Key objectives:** _What business questions should measurement answer?_

## Events

### Page & Navigation

| Event | Trigger | Description |
|-|-|-|
| page_view | Every page load | Standard pageview with page metadata |

### Lead Capture

| Event | Trigger | Description |
|-|-|-|
| generate_lead | Form submission (main CTA) | Primary lead form completed |
| form_start | First field interaction | User begins filling a form |
| form_submit | Form submit button click | User submits any form |
| form_error | Validation failure | Form submission failed validation |

### Content Engagement

| Event | Trigger | Description |
|-|-|-|
| file_download | Download link click | User downloads a resource (PDF, whitepaper, etc.) |
| video_start | Video play begins | User starts watching a video |
| video_progress | 25%, 50%, 75% milestones | User reaches video progress milestone |
| video_complete | Video ends | User finishes watching a video |
| scroll_depth | 25%, 50%, 75%, 90% thresholds | User scrolls to key page depth |
| cta_click | CTA button/link click | User clicks a call-to-action |

### User Journey

| Event | Trigger | Description |
|-|-|-|
| search | Search submission | User searches the site |
| select_content | Content card/link click | User selects a piece of content |
| view_item | Service/pricing page load | User views a service detail page |

### Conversions

| Event | Trigger | Description |
|-|-|-|
| sign_up | Account creation | New user registration |
| login | Successful login | User logs in |
| book_demo | Demo form submission | User books a demo/consultation |
| request_quote | Quote form submission | User requests a quote |
| phone_click | Phone number click | User clicks a phone number (click-to-call) |

## Parameters

### Lead Parameters

| Parameter | Type | Required | Description | Example |
|-|-|-|-|-|
| form_id | string | yes | Form identifier | "contact-main" |
| form_name | string | yes | Human-readable form name | "Contact Us" |
| form_type | string | no | Form category | "contact", "demo", "quote" |
| lead_source | string | no | How user arrived | "organic", "paid", "referral" |
| value | number | no | Estimated lead value | 500 |
| currency | string | no | Currency for value | "USD" |

### Content Parameters

| Parameter | Type | Required | Description | Example |
|-|-|-|-|-|
| content_type | string | no | Type of content | "whitepaper", "video", "blog" |
| content_id | string | no | Content identifier | "wp-analytics-guide" |
| content_name | string | no | Content title | "Analytics Best Practices" |
| file_name | string | no | Downloaded file name | "guide-2024.pdf" |
| file_extension | string | no | File type | "pdf" |

### CTA Parameters

| Parameter | Type | Required | Description | Example |
|-|-|-|-|-|
| cta_text | string | no | Button/link text | "Get Started" |
| cta_location | string | no | Page section | "hero", "footer", "sidebar" |
| cta_url | string | no | Destination URL | "/contact" |

### Video Parameters

| Parameter | Type | Required | Description | Example |
|-|-|-|-|-|
| video_title | string | no | Video name | "Product Overview" |
| video_duration | number | no | Length in seconds | 120 |
| video_percent | number | no | Progress percentage | 50 |
| video_provider | string | no | Hosting platform | "youtube", "vimeo" |

## Implementation Notes

- `generate_lead` is the primary conversion event — ensure it has accurate `value` for ROAS calculation
- Use `form_start` + `form_submit` to calculate form completion rates
- Distinguish between micro-conversions (downloads, video views) and macro-conversions (lead forms, demos)
- `phone_click` should use tel: link click detection
- For multi-step forms, fire `form_submit` at each step with a step identifier
- `scroll_depth` should fire once per threshold per page (not repeatedly)
