import { NextResponse } from "next/server";
import { getTenant } from "@/lib/tenant";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

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
  const body = await request.json();
  const { churchId, email, fullName, role, sendInvite } = body as {
    churchId: string;
    email: string;
    fullName?: string;
    role: string;
    sendInvite?: boolean;
  };
  if (churchId !== tenant.churchId || !email) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const admin = createAdminClient();
  let authUserId: string | null = null;

  if (sendInvite) {
    const { data: inviteData, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
      data: { full_name: fullName ?? email, church_id: churchId, role },
      redirectTo: `https://${tenant.subdomain}.${process.env.NEXT_PUBLIC_APP_DOMAIN ?? "kyston.org"}/auth/callback?church_id=${churchId}`,
    });
    if (inviteError) {
      return NextResponse.json({ error: inviteError.message }, { status: 400 });
    }
    authUserId = inviteData?.user?.id ?? null;
  } else {
    const randomPassword = crypto.randomUUID() + crypto.randomUUID();
    const { data: createData, error: createError } = await admin.auth.admin.createUser({
      email,
      password: randomPassword,
      email_confirm: true,
      user_metadata: {
        full_name: fullName ?? email,
        church_id: churchId,
        role,
      },
    });
    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 400 });
    }
    authUserId = createData?.user?.id ?? null;
  }

  if (authUserId) {
    await db.insert(users).values({
      id: authUserId,
      churchId,
      email,
      fullName: fullName ?? email,
      role: role as "student" | "facilitator" | "church_admin",
    }).onConflictDoUpdate({
      target: users.id,
      set: { churchId, role: role as "student" | "facilitator" | "church_admin", updatedAt: new Date() },
    });
  }
  return NextResponse.json({ ok: true });
}
