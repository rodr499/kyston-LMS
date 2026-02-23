# Kyston LMS — Plan

## Single Shared OAuth Callback for Integrations

**Status:** Implemented.

**Goal:** Use one redirect URI for all tenants (Zoom, Teams, Google Meet) so only one URL needs to be registered per provider in Azure/Zoom/Google.

### Problem
Currently the OAuth flow uses the request host (tenant subdomain) to build the callback URL. That means each tenant subdomain (gracechurch.localhost, hopechurch.kyston.org, etc.) produces a different redirect URI, and Azure does not support wildcards. You'd need to register a new redirect URI for every new church.

### Solution
Use a single shared callback URL that is not tenant-specific. The `state` parameter carries `churchId` and `subdomain` so the callback knows which church to attach the token to and where to redirect the user afterward.

### Changes

1. **Define shared callback base URL**
   - Add `NEXT_PUBLIC_APP_URL` or use `NEXT_PUBLIC_APP_DOMAIN` to derive the canonical app URL.
   - Dev: `http://localhost:3000` (or `http://app.localhost:3000` if using app subdomain).
   - Prod: `https://kyston.org` or `https://app.kyston.org`.

2. **Connect route** (`src/app/api/integrations/[platform]/connect/route.ts`)
   - Build `redirect_uri` from the shared base URL instead of `getOrigin(request)`.
   - Example: `redirect_uri = ${APP_BASE_URL}/api/integrations/${platform}/callback`.
   - Include `subdomain` in `state` alongside `churchId`: `state = { churchId, subdomain }`.

3. **Callback route** (`src/app/api/integrations/[platform]/callback/route.ts`)
   - Parse `state` to get both `churchId` and `subdomain`.
   - Store token in `church_integrations` for that `churchId`.
   - After success, redirect user to their tenant: `${proto}//${subdomain}.${APP_DOMAIN}/admin/integrations` (handle dev localhost format for subdomain.localhost:port).

4. **Provider app configuration**
   - Register only the shared callback URL(s):
     - `http://localhost:3000/api/integrations/teams/callback`
     - `https://kyston.org/api/integrations/teams/callback`
   - Same for Zoom and Google Meet.

### Files to modify
- `src/app/api/integrations/[platform]/connect/route.ts`
- `src/app/api/integrations/[platform]/callback/route.ts`
- `env.example` (if adding new env var)
