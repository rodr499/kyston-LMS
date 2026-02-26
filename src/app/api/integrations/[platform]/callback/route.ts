import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { churchIntegrations } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { createHmac, timingSafeEqual } from "crypto";

const PLATFORMS = ["zoom", "teams", "google_meet"] as const;

/** Shared OAuth callback base URL (no tenant subdomain). Must match registered redirect URIs in OAuth apps. */
function getSharedCallbackBase(): string {
  const base = process.env.NEXT_PUBLIC_APP_URL;
  if (base) return base.replace(/\/$/, "");
  const domain = process.env.NEXT_PUBLIC_APP_DOMAIN ?? "kyston.org";
  return domain.includes("localhost") ? "http://localhost:3000" : `https://${domain}`;
}

/** Build tenant URL from subdomain (e.g. gracechurch.localhost:3000 or gracechurch.kyston.org). */
function getTenantUrl(subdomain: string, path: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const url = new URL(base);
  const host = url.hostname + (url.port ? `:${url.port}` : "");
  const tenantHost = `${subdomain}.${host}`;
  return `${url.protocol}//${tenantHost}${path.startsWith("/") ? path : `/${path}`}`;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ platform: string }> }
) {
  const sharedBase = getSharedCallbackBase();
  const baseFallback = `${sharedBase}/?oauth_error=`;

  const { platform } = await params;
  if (!PLATFORMS.includes(platform as (typeof PLATFORMS)[number])) {
    return NextResponse.redirect(`${baseFallback}unknown`);
  }

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const stateParam = searchParams.get("state");
  const errorParam = searchParams.get("error");

  if (!stateParam) {
    return NextResponse.redirect(`${baseFallback}missing_state`);
  }

  // Verify HMAC-signed state to prevent forgery
  const stateSecret = process.env.OAUTH_STATE_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  const dotIndex = stateParam.lastIndexOf(".");
  if (dotIndex === -1) {
    return NextResponse.redirect(`${baseFallback}invalid_state`);
  }
  const statePayload = stateParam.slice(0, dotIndex);
  const stateHmac = stateParam.slice(dotIndex + 1);
  const expectedHmac = createHmac("sha256", stateSecret).update(statePayload).digest("hex");
  try {
    if (!timingSafeEqual(Buffer.from(stateHmac, "hex"), Buffer.from(expectedHmac, "hex"))) {
      return NextResponse.redirect(`${baseFallback}invalid_state`);
    }
  } catch {
    return NextResponse.redirect(`${baseFallback}invalid_state`);
  }

  let churchId: string;
  let subdomain: string;
  try {
    const decoded = JSON.parse(Buffer.from(statePayload, "base64url").toString());
    churchId = decoded.churchId;
    subdomain = decoded.subdomain;
    if (!churchId || !subdomain) throw new Error("invalid state");
  } catch (e) {
    console.error("[oauth callback] state decode error:", e);
    if (errorParam) {
      return NextResponse.redirect(`${baseFallback}${errorParam}`);
    }
    return NextResponse.redirect(`${baseFallback}invalid_state`);
  }

  const integrationsUrl = getTenantUrl(subdomain, "/admin/integrations");

  if (errorParam) {
    return NextResponse.redirect(`${integrationsUrl}?error=${errorParam}`);
  }
  if (!code) {
    return NextResponse.redirect(`${integrationsUrl}?error=missing_code`);
  }

  const redirectUri = `${sharedBase}/api/integrations/${platform}/callback`;

  let accessToken: string;
  let refreshToken: string | null = null;
  let tokenExpiresAt: Date | null = null;

  if (platform === "zoom") {
    const clientId = process.env.ZOOM_CLIENT_ID;
    const clientSecret = process.env.ZOOM_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      return NextResponse.redirect(`${integrationsUrl}?error=zoom_not_configured`);
    }
    const res = await fetch("https://zoom.us/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      console.error("Zoom token error:", err);
      return NextResponse.redirect(`${integrationsUrl}?error=zoom_token`);
    }
    const data = (await res.json()) as { access_token: string; refresh_token?: string; expires_in?: number };
    accessToken = data.access_token;
    refreshToken = data.refresh_token ?? null;
    if (data.expires_in) tokenExpiresAt = new Date(Date.now() + data.expires_in * 1000);
  } else if (platform === "teams") {
    const clientId = process.env.MICROSOFT_CLIENT_ID;
    const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      return NextResponse.redirect(`${integrationsUrl}?error=teams_not_configured`);
    }
    const res = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      console.error("Teams token error:", err);
      return NextResponse.redirect(`${integrationsUrl}?error=teams_token`);
    }
    const data = (await res.json()) as { access_token: string; refresh_token?: string; expires_in?: number };
    accessToken = data.access_token;
    refreshToken = data.refresh_token ?? null;
    if (data.expires_in) tokenExpiresAt = new Date(Date.now() + data.expires_in * 1000);
  } else {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      return NextResponse.redirect(`${integrationsUrl}?error=google_not_configured`);
    }
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      console.error("Google token error:", err);
      return NextResponse.redirect(`${integrationsUrl}?error=google_token`);
    }
    const data = (await res.json()) as { access_token: string; refresh_token?: string; expires_in?: number };
    accessToken = data.access_token;
    refreshToken = data.refresh_token ?? null;
    if (data.expires_in) tokenExpiresAt = new Date(Date.now() + data.expires_in * 1000);
  }

  const platformKey = platform as "zoom" | "teams" | "google_meet";
  const existing = await db.query.churchIntegrations.findFirst({
    where: and(
      eq(churchIntegrations.churchId, churchId),
      eq(churchIntegrations.platform, platformKey)
    ),
  });

  if (existing) {
    await db
      .update(churchIntegrations)
      .set({
        accessToken,
        refreshToken,
        tokenExpiresAt,
        isActive: true,
        updatedAt: new Date(),
      })
      .where(eq(churchIntegrations.id, existing.id));
  } else {
    await db.insert(churchIntegrations).values({
      churchId,
      platform: platformKey,
      accessToken,
      refreshToken,
      tokenExpiresAt,
      isActive: true,
    });
  }

  return NextResponse.redirect(integrationsUrl);
}
