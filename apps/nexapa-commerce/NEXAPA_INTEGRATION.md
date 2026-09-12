# Nexapa Commerce Integration

## Boundary

Medusa owns commerce data: products, variants, prices, carts, orders,
payments, refunds, promotions, and digital-delivery grants. Laravel remains the
source of truth for Nexapa accounts, subscriptions, and access to Publisher.
Supabase remains the source of truth for CRM workspaces and WhatsApp data.

The systems exchange only stable IDs and server-to-server events. Commerce must
never read or write the CRM database directly.

## Applications

| Application | Planned URL | Responsibility |
| --- | --- | --- |
| Medusa backend + Admin | `commerce.nexapa.app` | Commerce API and operator dashboard |
| Storefront | `store.nexapa.app` | Public catalog, checkout, customer downloads |
| Laravel API | `api.nexapa.app` | Nexapa identity, entitlement, provisioning |

## User bridge

The custom Medusa Admin route `/admin/nexapa-users` calls the Laravel-only
endpoint `/api/internal/commerce/users`. Both sides authenticate with
`NEXAPA_COMMERCE_BRIDGE_KEY`. The browser never receives that key.

Before enabling the page in production, Laravel must implement the endpoint
with constant-time key comparison, rate limiting, audit logging, pagination,
and a response containing only the fields required by the Admin page.

## Digital product delivery

Digital files must live in a private object-storage bucket. A successful,
verified payment creates an immutable purchase entitlement. An authenticated
customer requests a download and receives a short-lived signed URL. Store only
the object key, never a public object URL. Every request must verify the order,
customer, refund state, expiry, and download limit.

Recommended delivery states:

1. `pending_payment`
2. `active`
3. `revoked` after refund or chargeback
4. `expired` when the configured access period ends

Webhook processing and entitlement creation must be idempotent.

## Rollout

1. Run Medusa with PostgreSQL and Redis on a non-production domain.
2. Implement the Laravel read-only user bridge and verify admin authorization.
3. Add the digital asset, entitlement, and signed-download modules.
4. Integrate an Indonesian payment provider and verify webhooks.
5. Build the storefront and customer library.
6. Add SSO only after account-linking and rollback tests pass.
7. Migrate selected Filament operations; keep the old panel available during
   the transition and remove it only after parity is proven.

## Licensing

The Medusa core is MIT licensed. Do not copy files identified as Enterprise
Edition or use Enterprise RBAC without the required Medusa commercial
agreement. Nexapa-specific access control must remain original code unless a
commercial license is obtained.
