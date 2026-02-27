# Subdomain feature

Kyston LMS uses subdomains for multi-tenant isolation. Each church (tenant) has a unique subdomain, e.g. `gracechurch.kyston.org`.

## How it works

- **Root domain** (`kyston.org` or `localhost:3000`): Marketing/landing, login, register, and "Go to your church" flow
- **Tenant subdomain** (`gracechurch.kyston.org`): That church's LMS (LearningHub, admin, facilitator, learn)
- **Superadmin subdomain** (`superadmin.kyston.org`): Platform administration

---

## Production: Dynu + Vercel setup

Use [Dynu](https://www.dynu.com/) for DNS and [Vercel](https://vercel.com) for hosting. Dynu uses a **wildcard subdomain** (e.g. `*.kyston.org`), so subdomains resolve automatically. Each subdomain only needs to be added in **Vercel** so Vercel routes and issues SSL for it.

### Automated subdomain (Vercel only)

When you create a tenant in Super Admin, the app automatically adds the domain in Vercel. When you delete a tenant, it removes the domain from Vercel.

Configure these env vars to enable automation:

```
VERCEL_TOKEN=         # From Vercel → Settings → Tokens
VERCEL_PROJECT_ID=    # Or VERCEL_PROJECT_NAME
VERCEL_TEAM_ID=       # If using a team
```

If env vars are missing, tenant creation still works; add subdomains manually in Vercel.

### Dynu setup (wildcard)

In [Dynu Control Panel](https://www.dynu.com/ControlPanel) → DDNS Services → your domain → DNS Records, configure the apex and wildcard so all subdomains resolve to Vercel (e.g. A record for apex, wildcard alias, or per-subdomain A records if not using wildcard).

### Vercel setup

**Project** → **Settings** → **Domains**:

- Add `kyston.org` (apex)
- Add `www.kyston.org` (optional)
- Add `superadmin.kyston.org` (for superadmin subdomain)
- Tenant subdomains are added automatically when configured, or manually

### Manual subdomain (when automation is not configured)

**Vercel** — Project → Settings → Domains:

- Add `gracechurch.kyston.org`

### Verify

- **Subdomain**: `dig gracechurch.kyston.org +short` → should resolve
- **Propagation**: [whatsmydns.net](https://www.whatsmydns.net/) (can take up to 24–48 hours)

### Environment

```
NEXT_PUBLIC_APP_DOMAIN=kyston.org
```

---

## Local development

To test tenant subdomains locally:

1. Run the dev server: `npm run dev`
2. Visit `http://gracechurch.localhost:3000` (replace `gracechurch` with a subdomain that exists in your database)

Most systems resolve `*.localhost` to `127.0.0.1`, so no `/etc/hosts` changes are needed.

### Using the Go page

From the root at `http://localhost:3000`, click **Go to your church** and enter a subdomain (e.g. `gracechurch`). You'll be redirected to `http://gracechurch.localhost:3000`.
