# Nexapa Native Commerce

Nexapa Native Commerce sells and delivers digital products without depending
on the Medusa runtime, API, SDK, Cloud, data model, or npm packages.

## Applications

| Component | Location | Responsibility |
| --- | --- | --- |
| Admin | `apps/nexapa-commerce-admin` | Products, orders, customers, coupons, files and reports |
| Storefront | `apps/nexapa-store` | Catalog, checkout and customer downloads |
| API | `apps/nexapa-api` | Authentication and all commerce business rules |

## Ownership boundary

Laravel is the only source of truth for products, prices, orders, payments,
refunds, download entitlements and audit records. The two React applications
are clients of the Laravel API.

## Digital delivery rules

- Product files are private and never exposed through permanent public URLs.
- Verified payment creates an idempotent entitlement.
- Downloads use short-lived signed URLs.
- Refunds and chargebacks revoke the entitlement.
- Payment webhooks are signature-verified, replay-safe and idempotent.
- Money is stored as integer minor units with an explicit currency code.

## UI source policy

Community UI code may be adapted only from paths licensed under MIT. All paths
listed in the upstream `ENTERPRISE-LICENSE.md`, including RBAC, policies,
roles, permission providers and SSO components, are excluded. Nexapa access
control is original backend and frontend code.
