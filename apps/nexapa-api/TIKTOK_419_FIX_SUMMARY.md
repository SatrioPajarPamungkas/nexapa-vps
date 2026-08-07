# TikTok Connected Accounts 419 Error - Fix Summary

## Root Cause

HTTP 419 (CSRF Token Mismatch) occurs because Laravel Sanctum's stateful authentication is not properly configured for the cross-subdomain setup between:
- Frontend: `https://app.nexapa.me`
- Backend: `https://api.nexapa.me`

The session cookie and CSRF token validation fail because:
1. Session cookie domain not set to `.nexapa.me` (needs to include leading dot for all subdomains)
2. `SANCTUM_STATEFUL_DOMAINS` not including `app.nexapa.me`
3. Frontend not sending credentials with requests
4. Frontend not fetching CSRF cookie before making state-changing requests

## Files Changed

### Backend (nexapa-api)

1. **`.env.example`** - Updated with production values:
   - `APP_URL=https://api.nexapa.me`
   - `FRONTEND_URL=https://app.nexapa.me`
   - `SESSION_DOMAIN=.nexapa.me`
   - `SESSION_SECURE_COOKIE=true`
   - `SESSION_SAME_SITE=lax`
   - `SANCTUM_STATEFUL_DOMAINS=app.nexapa.me`

### Backend Files Already Correct (No Changes Needed)

- `bootstrap/app.php` - Already has `$middleware->statefulApi()`
- `config/cors.php` - Already allows credentials and correct origins
- `config/session.php` - Already reads from environment variables
- `config/sanctum.php` - Already reads from environment variables
- `routes/api.php` - Connected account routes already protected by `auth:sanctum`

### Frontend (app.nexapa.me - requires separate update)

The frontend Axios client must be configured to:

```typescript
// Axios configuration
const apiClient = axios.create({
  baseURL: 'https://api.nexapa.me',
  withCredentials: true,
  withXSRFToken: true,
  headers: {
    'Accept': 'application/json',
  },
});

// Before POSTing Connect TikTok, fetch CSRF cookie
await apiClient.get('/sanctum/csrf-cookie');

// Then POST to connect endpoint
const response = await apiClient.post('/api/v1/connected-accounts/tiktok/connect');

// Read authorization URL from response
const authorizationUrl = response.data.authorization_url || response.data.data?.authorization_url;

// Redirect to TikTok
window.location.assign(authorizationUrl);

// Always reset loading state in finally block
```

## Production .env Configuration

Add these to your production `.env` file on `api.nexapa.me`:

```env
APP_URL=https://api.nexapa.me
FRONTEND_URL=https://app.nexapa.me
SESSION_DOMAIN=.nexapa.me
SESSION_SECURE_COOKIE=true
SESSION_SAME_SITE=lax
SANCTUM_STATEFUL_DOMAINS=app.nexapa.me
```

**Do not modify:**
- `APP_KEY` (must remain your unique application key)
- `TIKTOK_CLIENT_KEY` and `TIKTOK_CLIENT_SECRET` (keep existing secrets)

## Commands to Run After Deployment

SSH into your API server and run:

```bash
cd /var/www/nexapa-api

# Clear all cached configuration
php artisan optimize:clear

# Cache the new configuration
php artisan config:cache

# Optionally clear session cache
php artisan cache:clear sessions
```

## Manual Browser Verification Steps

1. **Clear browser cookies** for `nexapa.me` domain

2. **Log in** at `https://app.nexapa.me`

3. **Open browser DevTools** → Network tab

4. **Click "Connect TikTok"** button

5. **Verify the following requests in order:**

   a. **GET /sanctum/csrf-cookie**
      - Status: `200 OK`
      - Response headers should include: `Set-Cookie: XSRF-TOKEN=...`
      - Cookie domain: `.nexapa.me`

   b. **POST /api/v1/connected-accounts/tiktok/connect**
      - Status: `200 OK` or `201 Created` (NOT 419)
      - Request headers should include:
        - `Cookie: xsrf_token=...; nexapa-api-session=...`
        - `X-XSRF-TOKEN: ...`
      - Response body should contain:
        ```json
        {
          "authorization_url": "https://www.tiktok.com/oauth/..."
        }
        ```

6. **Verify redirect:**
   - Browser should automatically redirect to TikTok OAuth page
   - URL should start with `https://www.tiktok.com/oauth/...`

7. **After authorizing on TikTok:**
   - Browser should redirect back to your frontend callback
   - Connected account should appear in the list

## Troubleshooting

If still getting 419:

1. **Check session table exists:**
   ```bash
   php artisan migrate:status | grep sessions
   ```

2. **Verify cookies are being set:**
   - In DevTools → Application → Cookies
   - Check `XSRF-TOKEN` and session cookie exist for `.nexapa.me`

3. **Verify CORS headers:**
   - Response should include: `Access-Control-Allow-Credentials: true`
   - Response should include: `Access-Control-Allow-Origin: https://app.nexapa.me`

4. **Check logs:**
   ```bash
   tail -f storage/logs/laravel.log
   ```

## Security Notes

- `SESSION_SECURE_COOKIE=true` ensures cookies only sent over HTTPS
- `SESSION_SAME_SITE=lax` allows cross-site navigation while preventing CSRF
- `SESSION_DOMAIN=.nexapa.me` (with leading dot) allows all subdomains
- Never commit `.env` with real secrets to version control
