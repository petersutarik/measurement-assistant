# SaaS / Web Application Measurement Plan

## Overview

- **Site type:** SaaS / Web Application
- **Business context:** _Describe the product, target users, and business model_
- **Key objectives:** _What business questions should measurement answer?_

## Events

### Page & Navigation

| Event | Trigger | Description |
|-|-|-|
| page_view | Every page/screen load | Standard pageview with page metadata |

### Acquisition & Onboarding

| Event | Trigger | Description |
|-|-|-|
| sign_up | Registration complete | New user creates account |
| login | Successful login | User logs in |
| tutorial_begin | Onboarding starts | User starts onboarding flow |
| tutorial_complete | Onboarding finished | User completes onboarding |
| select_plan | Plan selection | User selects a pricing plan |

### Subscription & Revenue

| Event | Trigger | Description |
|-|-|-|
| begin_checkout | Checkout/upgrade page load | User starts payment flow |
| purchase | Payment confirmed | Subscription purchased or renewed |
| refund | Cancellation/refund processed | Subscription refunded |
| upgrade | Plan upgrade confirmed | User upgrades to higher tier |
| downgrade | Plan downgrade confirmed | User downgrades to lower tier |

### Feature Usage

| Event | Trigger | Description |
|-|-|-|
| feature_use | Feature interaction | User uses a key product feature |
| create_item | Content/item created | User creates something in the app |
| delete_item | Content/item deleted | User deletes something |
| export_data | Export action triggered | User exports data |
| import_data | Import completed | User imports data |
| share | Share action triggered | User shares content with others |

### Collaboration

| Event | Trigger | Description |
|-|-|-|
| invite_sent | Team invite sent | User invites a team member |
| invite_accepted | Invite link used | Invited user joins the account |

### Engagement & Retention

| Event | Trigger | Description |
|-|-|-|
| search | Search submission | User searches within the app |
| notification_click | Notification interaction | User clicks a notification |
| settings_change | Settings updated | User modifies account/app settings |
| feedback_submit | Feedback form submission | User submits feedback |

### Support

| Event | Trigger | Description |
|-|-|-|
| help_open | Help/docs opened | User opens help center |
| support_ticket | Ticket created | User creates a support ticket |

## Parameters

### User Parameters

| Parameter | Type | Required | Description | Example |
|-|-|-|-|-|
| user_id | string | yes | Internal user ID (hashed) | "usr_abc123" |
| account_id | string | no | Account/org ID | "acc_xyz789" |
| user_role | string | no | Role in the account | "admin", "member", "viewer" |
| plan_name | string | no | Current subscription plan | "pro", "enterprise" |
| account_age_days | number | no | Days since account creation | 45 |

### Subscription Parameters

| Parameter | Type | Required | Description | Example |
|-|-|-|-|-|
| transaction_id | string | yes | Payment/invoice ID | "inv_001" |
| value | number | yes | Payment amount | 49.99 |
| currency | string | yes | ISO 4217 currency | "USD" |
| plan_name | string | yes | Plan purchased | "Pro Annual" |
| billing_period | string | no | Billing frequency | "monthly", "annual" |
| is_trial | boolean | no | Trial conversion | true |

### Feature Parameters

| Parameter | Type | Required | Description | Example |
|-|-|-|-|-|
| feature_name | string | yes | Feature identifier | "report_builder" |
| feature_category | string | no | Feature group | "analytics", "admin" |
| action | string | no | Specific action taken | "create", "edit", "delete" |
| item_type | string | no | Type of item acted on | "report", "dashboard" |
| item_count | number | no | Number of items | 5 |

## Implementation Notes

- `user_id` should be a hashed/anonymized identifier, never PII
- Track `feature_use` for the 5-10 most important features, not every click
- `purchase` should fire for both new subscriptions and renewals
- Use `upgrade`/`downgrade` separately from `purchase` — they indicate plan changes
- `tutorial_complete` is a critical activation metric — ensure it fires reliably
- For free-to-paid conversion tracking, include `is_trial` on `purchase` events
- `invite_sent` → `invite_accepted` funnel is key for viral growth measurement
