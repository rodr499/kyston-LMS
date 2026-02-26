import { NextResponse } from "next/server";
import { getTenant } from "@/lib/tenant";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { users, churchIntegrations } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getTeamsAccessToken } from "@/lib/integrations/microsoft-graph";

const GRAPH_BASE = "https://graph.microsoft.com/v1.0";

/** GET: list calendars for the church's Teams integration (for picker). */
export async function GET() {
  const tenant = await getTenant();
  if (!tenant) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const u = await db.query.users.findFirst({
    where: eq(users.id, user.id),
    columns: { role: true, churchId: true },
  });
  const canAdmin = (u?.role === "church_admin" || u?.role === "super_admin") && u?.churchId === tenant.churchId;
  if (!canAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const accessToken = await getTeamsAccessToken(tenant.churchId);
  if (!accessToken) {
    return NextResponse.json(
      { error: "Microsoft Teams is not connected. Connect Teams in Settings → Integrations first." },
      { status: 400 }
    );
  }

  const res = await fetch(`${GRAPH_BASE}/me/calendars?$select=id,name`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json(
      { error: text || "Failed to list calendars" },
      { status: res.status }
    );
  }
  const data = (await res.json()) as { value?: Array<{ id: string; name?: string | null }> };
  const calendars = (data.value ?? []).map((c) => ({ id: c.id, name: c.name ?? "Unnamed" }));

  const integration = await db.query.churchIntegrations.findFirst({
    where: and(
      eq(churchIntegrations.churchId, tenant.churchId),
      eq(churchIntegrations.platform, "teams"),
      eq(churchIntegrations.isActive, true)
    ),
    columns: { metadata: true },
  });
  const meta = (integration?.metadata as { calendarId?: string } | null) ?? {};
  const selectedCalendarId = meta.calendarId ?? null;

  return NextResponse.json({ calendars, selectedCalendarId });
}

/** PATCH: set which calendar to use for new Teams meetings. Body: { calendarId: string | null }. */
export async function PATCH(request: Request) {
  const tenant = await getTenant();
  if (!tenant) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const u = await db.query.users.findFirst({
    where: eq(users.id, user.id),
    columns: { role: true, churchId: true },
  });
  const canAdmin = (u?.role === "church_admin" || u?.role === "super_admin") && u?.churchId === tenant.churchId;
  if (!canAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const { calendarId } = body as { calendarId?: string | null };

  const integration = await db.query.churchIntegrations.findFirst({
    where: and(
      eq(churchIntegrations.churchId, tenant.churchId),
      eq(churchIntegrations.platform, "teams"),
      eq(churchIntegrations.isActive, true)
    ),
    columns: { id: true, metadata: true },
  });
  if (!integration) {
    return NextResponse.json({ error: "Teams not connected" }, { status: 400 });
  }

  const currentMeta = (integration.metadata as Record<string, unknown>) ?? {};
  const newMeta = {
    ...currentMeta,
    calendarId: calendarId == null || calendarId === "" ? null : String(calendarId),
  };
  await db
    .update(churchIntegrations)
    .set({ metadata: newMeta, updatedAt: new Date() })
    .where(eq(churchIntegrations.id, integration.id));

  return NextResponse.json({ ok: true });
}
