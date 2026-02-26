import { NextResponse } from "next/server";
import { getTenant } from "@/lib/tenant";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { users, programs } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

export async function POST(request: Request) {
  const tenant = await getTenant();
  if (!tenant) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const row = await db.query.users.findFirst({
    where: eq(users.id, user.id),
    columns: { role: true, churchId: true },
  });
  const canAdmin = (row?.role === "church_admin" || row?.role === "super_admin") && row?.churchId === tenant.churchId;
  if (!canAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await request.json();
  const { churchId, name, description, isPublished } = body as {
    churchId: string;
    name: string;
    description?: string;
    isPublished?: boolean;
  };
  if (churchId !== tenant.churchId || !name) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const [created] = await db.insert(programs).values({
    churchId,
    name,
    description: description ?? null,
    isPublished: isPublished ?? false,
  }).returning({ id: programs.id });
  return NextResponse.json({ id: created?.id });
}

export async function PATCH(request: Request) {
  const tenant = await getTenant();
  if (!tenant) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const row = await db.query.users.findFirst({
    where: eq(users.id, user.id),
    columns: { role: true, churchId: true },
  });
  const canAdmin = (row?.role === "church_admin" || row?.role === "super_admin") && row?.churchId === tenant.churchId;
  if (!canAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await request.json();
  const { programId, name, description, isPublished } = body as {
    programId: string;
    name?: string;
    description?: string;
    isPublished?: boolean;
  };
  if (!programId) return NextResponse.json({ error: "programId required" }, { status: 400 });
  await db.update(programs).set({
    ...(name != null && { name }),
    ...(description != null && { description }),
    ...(isPublished != null && { isPublished }),
    updatedAt: new Date(),
  }).where(and(eq(programs.id, programId), eq(programs.churchId, tenant.churchId)));
  return NextResponse.json({ ok: true });
}
