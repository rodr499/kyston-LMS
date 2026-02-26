import { NextResponse } from "next/server";
import { getTenant } from "@/lib/tenant";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { db } from "@/lib/db";
import { users, churchIntegrations } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getTeamsAccessToken, getGroupMembers } from "@/lib/integrations/microsoft-graph";

const SYNC_ROLES = ["church_admin", "facilitator", "student"] as const;
type SyncRole = (typeof SYNC_ROLES)[number];
type GroupRoleMapping = { groupId: string; role: SyncRole };

const ROLE_RANK: Record<string, number> = { church_admin: 3, facilitator: 2, student: 1 };
function higherRole(a: SyncRole, b: SyncRole): SyncRole {
  return (ROLE_RANK[b] ?? 0) > (ROLE_RANK[a] ?? 0) ? b : a;
}

/** GET: return current group–role mappings and legacy facilitatorGroupIds (if Teams connected). */
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

  const integration = await db.query.churchIntegrations.findFirst({
    where: and(
      eq(churchIntegrations.churchId, tenant.churchId),
      eq(churchIntegrations.platform, "teams"),
      eq(churchIntegrations.isActive, true)
    ),
    columns: { metadata: true },
  });
  const meta = (integration?.metadata as {
    facilitatorGroupId?: string;
    facilitatorGroupIds?: string[];
    groupRoleMappings?: GroupRoleMapping[];
  } | null) ?? {};
  let groupRoleMappings: GroupRoleMapping[] = [];
  if (Array.isArray(meta.groupRoleMappings) && meta.groupRoleMappings.length > 0) {
    groupRoleMappings = meta.groupRoleMappings.filter(
      (m): m is GroupRoleMapping =>
        typeof m?.groupId === "string" &&
        m.groupId.trim().length > 0 &&
        SYNC_ROLES.includes(m.role as SyncRole)
    );
  } else {
    const ids = Array.isArray(meta.facilitatorGroupIds)
      ? meta.facilitatorGroupIds.filter((id): id is string => typeof id === "string" && id.trim().length > 0)
      : meta.facilitatorGroupId?.trim()
        ? [meta.facilitatorGroupId.trim()]
        : [];
    groupRoleMappings = ids.map((groupId) => ({ groupId, role: "facilitator" as SyncRole }));
  }
  return NextResponse.json({ groupRoleMappings, connected: !!integration });
}

/** POST: optional facilitatorGroupIds to save; then run sync if any group is set. */
export async function POST(request: Request) {
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

  let body: {
    facilitatorGroupId?: string | null;
    facilitatorGroupIds?: string[] | null;
    groupRoleMappings?: GroupRoleMapping[] | null;
  } = {};
  try {
    body = await request.json();
  } catch {
    // optional body
  }

  const churchId = tenant.churchId;
  const integration = await db.query.churchIntegrations.findFirst({
    where: and(
      eq(churchIntegrations.churchId, churchId),
      eq(churchIntegrations.platform, "teams"),
      eq(churchIntegrations.isActive, true)
    ),
    columns: { id: true, metadata: true },
  });

  if (!integration) {
    return NextResponse.json(
      { error: "Microsoft Teams is not connected. Connect Teams in Settings → Integrations first." },
      { status: 400 }
    );
  }

  const currentMeta = (integration.metadata as Record<string, unknown>) ?? {};
  let mappingsToSync: GroupRoleMapping[] = [];

  if (body.groupRoleMappings !== undefined) {
    const raw = Array.isArray(body.groupRoleMappings) ? body.groupRoleMappings : [];
    mappingsToSync = raw
      .map((m) =>
        m && typeof m.groupId === "string" && m.groupId.trim() && SYNC_ROLES.includes(m.role as SyncRole)
          ? { groupId: m.groupId.trim(), role: m.role as SyncRole }
          : null
      )
      .filter((m): m is GroupRoleMapping => m !== null);
    const newMeta = { ...currentMeta, groupRoleMappings: mappingsToSync };
    await db
      .update(churchIntegrations)
      .set({ metadata: newMeta, updatedAt: new Date() })
      .where(eq(churchIntegrations.id, integration.id));
  } else if (body.facilitatorGroupIds !== undefined || body.facilitatorGroupId !== undefined) {
    const rawIds = Array.isArray(body.facilitatorGroupIds)
      ? body.facilitatorGroupIds
      : body.facilitatorGroupId != null
        ? [body.facilitatorGroupId]
        : [];
    const ids = rawIds.map((id) => (typeof id === "string" ? id.trim() : "")).filter(Boolean);
    mappingsToSync = ids.map((groupId) => ({ groupId, role: "facilitator" as SyncRole }));
    const newMeta = { ...currentMeta, facilitatorGroupIds: ids, groupRoleMappings: mappingsToSync };
    await db
      .update(churchIntegrations)
      .set({ metadata: newMeta, updatedAt: new Date() })
      .where(eq(churchIntegrations.id, integration.id));
  } else {
    const meta = integration.metadata as {
      facilitatorGroupId?: string;
      facilitatorGroupIds?: string[];
      groupRoleMappings?: GroupRoleMapping[];
    } | null;
    if (Array.isArray(meta?.groupRoleMappings) && meta.groupRoleMappings.length > 0) {
      mappingsToSync = meta.groupRoleMappings.filter(
        (m): m is GroupRoleMapping =>
          typeof m?.groupId === "string" &&
          m.groupId.trim().length > 0 &&
          SYNC_ROLES.includes(m.role as SyncRole)
      );
    } else {
      const ids = Array.isArray(meta?.facilitatorGroupIds)
        ? meta.facilitatorGroupIds.filter((id): id is string => typeof id === "string" && id.trim().length > 0)
        : meta?.facilitatorGroupId?.trim()
          ? [meta.facilitatorGroupId.trim()]
          : [];
      mappingsToSync = ids.map((groupId) => ({ groupId, role: "facilitator" as SyncRole }));
    }
  }

  if (mappingsToSync.length === 0) {
    return NextResponse.json({
      ok: true,
      message: "Add at least one AD group → LMS role mapping and run sync again.",
      synced: 0,
      created: 0,
      updated: 0,
      skippedSuperAdmin: 0,
    });
  }

  const accessToken = await getTeamsAccessToken(churchId);
  if (!accessToken) {
    return NextResponse.json(
      { error: "Could not get Microsoft 365 access token. Try reconnecting Teams in Integrations." },
      { status: 400 }
    );
  }

  const memberByEmail = new Map<
    string,
    { id: string; displayName: string | null; mail: string | null; role: SyncRole }
  >();
  for (const { groupId, role } of mappingsToSync) {
    try {
      const list = await getGroupMembers(accessToken, groupId);
      for (const m of list) {
        const email = m.mail?.trim();
        if (!email) continue;
        const existing = memberByEmail.get(email);
        const bestRole = !existing ? role : higherRole(existing.role, role);
        memberByEmail.set(email, { ...m, role: bestRole });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch group members";
      return NextResponse.json(
        { error: `Microsoft Graph error for group ${groupId}: ${message}. Check group IDs and Group.Read.All permission.` },
        { status: 400 }
      );
    }
  }
  const members = Array.from(memberByEmail.values());

  const admin = createAdminClient();
  let created = 0;
  let updated = 0;
  let skippedSuperAdmin = 0;

  for (const m of members) {
    const email = m.mail?.trim();
    if (!email) continue;
    const targetRole = m.role;

    const fullName = m.displayName?.trim() || email;
    const existing = await db.query.users.findFirst({
      where: and(eq(users.email, email), eq(users.churchId, churchId)),
      columns: { id: true, role: true },
    });

    if (existing) {
      if (existing.role === "super_admin") {
        skippedSuperAdmin++;
        continue;
      }
      if (existing.role !== targetRole) {
        await db
          .update(users)
          .set({ role: targetRole, updatedAt: new Date() })
          .where(eq(users.id, existing.id));
        updated++;
      }
      continue;
    }

    const randomPassword = crypto.randomUUID() + crypto.randomUUID();
    const { data: createData, error: createError } = await admin.auth.admin.createUser({
      email,
      password: randomPassword,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        church_id: churchId,
        role: targetRole,
      },
    });
    if (createError) {
      continue;
    }
    const authUserId = createData?.user?.id ?? null;
    if (authUserId) {
      await db.insert(users).values({
        id: authUserId,
        churchId,
        email,
        fullName,
        role: targetRole,
      }).onConflictDoUpdate({
        target: users.id,
        set: { churchId, email, fullName, role: targetRole, updatedAt: new Date() },
      });
      created++;
    }
  }

  return NextResponse.json({
    ok: true,
    synced: members.length,
    created,
    updated,
    skippedSuperAdmin,
  });
}
