import { NextRequest, NextResponse } from "next/server";
import { getTenant } from "@/lib/tenant";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { createHmac } from "crypto";

const PLATFORMS = ["zoom", "teams", "google_meet"] as const;

function getOrigin(request: NextRequest): string {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "localhost:3000";
  const proto = request.headers.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/** Shared OAuth callback base URL (no tenant subdomain). Must match registered redirect URIs in OAuth apps. */
function getSharedCallbackBase(): string {
  const base = process.env.NEXT_PUBLIC_APP_URL;
  if (base) return base.replace(/\/$/, "");
  const domain = process.env.NEXT_PUBLIC_APP_DOMAIN ?? "kyston.org";
  return domain.includes("localhost") ? "http://localhost:3000" : `https://${domain}`;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ platform: string }> }
) {
  const { platform } = await params;
  if (!PLATFORMS.includes(platform as (typeof PLATFORMS)[number])) {
    return NextResponse.json({ error: "Unknown platform" }, { status: 400 });
  }

  const origin = getOrigin(request);
  const tenant = await getTenant();
  if (!tenant) {
    return NextResponse.redirect(`${origin}/login`);
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(`${origin}/login`);
  }
  const row = await db.query.users.findFirst({
    where: eq(users.id, user.id),
    columns: { role: true, churchId: true },
  });
  const canAdmin = (row?.role === "church_admin" || row?.role === "super_admin") && row?.churchId === tenant.churchId;
  if (!canAdmin) return NextResponse.redirect(`${origin}/`);
  const sharedBase = getSharedCallbackBase();
  const redirectUri = `${sharedBase}/api/integrations/${platform}/callback`;
  const stateSecret = process.env.OAUTH_STATE_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  const statePayload = Buffer.from(
    JSON.stringify({ churchId: tenant.churchId, subdomain: tenant.subdomain })
  ).toString("base64url");
  const hmac = createHmac("sha256", stateSecret).update(statePayload).digest("hex");
  const state = `${statePayload}.${hmac}`;
  const integrationsUrl = `${origin}/admin/integrations`;

  if (platform === "zoom") {
    const clientId = process.env.ZOOM_CLIENT_ID;
    if (!clientId) {
      return NextResponse.redirect(`${integrationsUrl}?error=zoom_not_configured`);
    }
    const url = new URL("https://zoom.us/oauth/authorize");
    url.searchParams.set("response_type", "code");
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("state", state);
    return NextResponse.redirect(url.toString());
  }

  if (platform === "teams") {
    const clientId = process.env.MICROSOFT_CLIENT_ID;
    if (!clientId) {
      return NextResponse.redirect(`${integrationsUrl}?error=teams_not_configured`);
    }
    const url = new URL("https://login.microsoftonline.com/common/oauth2/v2.0/authorize");
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("response_mode", "query");
    url.searchParams.set("scope", "OnlineMeetings.ReadWrite Calendars.ReadWrite User.Read Group.Read.All openid offline_access");
    url.searchParams.set("state", state);
    url.searchParams.set("prompt", "select_account");
    return NextResponse.redirect(url.toString());
  }

  if (platform === "google_meet") {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      return NextResponse.redirect(`${integrationsUrl}?error=google_not_configured`);
    }
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("scope", "https://www.googleapis.com/auth/calendar.events");
    url.searchParams.set("access_type", "offline");
    url.searchParams.set("prompt", "consent");
    url.searchParams.set("state", state);
    return NextResponse.redirect(url.toString());
  }

  return NextResponse.json({ error: "Unknown platform" }, { status: 400 });
}
