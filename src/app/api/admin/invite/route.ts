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
  if (u?.role !== "church_admin" || u.churchId !== tenant.churchId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await request.json();
  const { churchId, email, fullName, role } = body as {
    churchId: string;
    email: string;
    fullName?: string;
    role: string;
  };
  if (churchId !== tenant.churchId || !email) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const admin = createAdminClient();
  const { data: inviteData, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { full_name: fullName ?? email, church_id: churchId, role },
    redirectTo: `https://${tenant.subdomain}.${process.env.NEXT_PUBLIC_APP_DOMAIN ?? "kyston.org"}/auth/callback?church_id=${churchId}`,
  });
  if (inviteError) {
    return NextResponse.json({ error: inviteError.message }, { status: 400 });
  }
  if (inviteData?.user?.id) {
    await db.insert(users).values({
      id: inviteData.user.id,
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
