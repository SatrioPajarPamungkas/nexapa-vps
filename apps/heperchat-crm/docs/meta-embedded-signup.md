# Meta Embedded Signup for Nexapa CRM

Nexapa uses Meta Embedded Signup as the primary WhatsApp onboarding path.
Customers authorize a business and choose a phone number inside Meta; they do
not paste access tokens or webhook verify tokens into the CRM.

## Production environment

Set these server-side variables in `/srv/nexapa-crm/app/.env.local`:

```dotenv
META_APP_ID=1390486843051496
META_APP_SECRET=<Meta App Settings -> Basic -> App secret>
META_WHATSAPP_CONFIGURATION_ID=1601599971312327
META_GRAPH_API_VERSION=v26.0
NEXT_PUBLIC_SITE_URL=https://crm.nexapa.app

# One global value for the Nexapa webhook. It must match the verify token
# already saved in the Meta app's WhatsApp webhook configuration.
WHATSAPP_WEBHOOK_VERIFY_TOKEN=<existing-global-verify-token>
```

`META_APP_SECRET` and `WHATSAPP_WEBHOOK_VERIFY_TOKEN` must never use a
`NEXT_PUBLIC_` prefix. App ID and configuration ID are public identifiers, but
this implementation still serves them at runtime through an authenticated API
route so one build can be promoted between environments.

The existing `ENCRYPTION_KEY`, Supabase URL, anon key and service-role key are
still required. No database migration is required; Embedded Signup persists to
the existing account-scoped `whatsapp_config` row.

## Meta configuration

- App mode is Live.
- App type is Business and Nexapa is a verified Tech Provider.
- Configuration `1601599971312327` uses WhatsApp Cloud API.
- `crm.nexapa.app` is listed as an allowed app/login domain and JavaScript SDK
  login is enabled.
- Token type is System User with no expiry.
- Assets include WhatsApp accounts.
- Permissions include `whatsapp_business_management` and
  `whatsapp_business_messaging`.
- Callback webhook remains `https://crm.nexapa.app/api/whatsapp/webhook`.
- The webhook is subscribed to `messages` and the required template/phone
  status fields.

## What the completion endpoint does

1. Requires an authenticated workspace admin.
2. Exchanges Meta's one-time code using the app secret on the server.
3. Verifies that the selected phone number belongs to the selected WABA.
4. Rejects a number already claimed by another Nexapa workspace.
5. Subscribes the WABA to the Nexapa Meta app.
6. Registers a new phone number with a cryptographically generated six-digit
   two-step-verification PIN. A customer connecting an existing Cloud API
   number can provide that number's existing PIN instead.
7. Encrypts the system-user token with `ENCRYPTION_KEY` and stores it in the
   workspace's existing `whatsapp_config` row.

For a new number, the generated registration PIN is returned to the admin once
and is not persisted. Meta Business Manager can be used to reset it if it is
lost. Access tokens and webhook verify tokens are never requested from the
customer.

## Deploy and smoke test

```bash
cd /srv/nexapa-crm/app
npm ci
npm run typecheck
npm test
npm run build
sudo systemctl restart nexapa-crm.service
```

Then sign in as a workspace owner/admin, open **Settings -> WhatsApp**, click
**Continue with Meta**, select the business and number, and confirm:

- the CRM shows Connected;
- **Verify with Meta** reports all checks live;
- an inbound WhatsApp message appears in Inbox;
- a reply sent from Inbox reaches the WhatsApp number.
