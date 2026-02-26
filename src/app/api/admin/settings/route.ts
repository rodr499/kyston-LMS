import { NextResponse } from "next/server";
import { getTenant } from "@/lib/tenant";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { users, churches } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

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
  const body = await request.json();
  const { churchId, name, primaryColor } = body as { churchId: string; name?: string; primaryColor?: string };
  if (churchId !== tenant.churchId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  await db.update(churches).set({
    ...(name != null && { name }),
    ...(primaryColor != null && { primaryColor }),
    updatedAt: new Date(),
  }).where(eq(churches.id, churchId));
  return NextResponse.json({ ok: true });
}
