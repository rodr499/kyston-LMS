import { NextResponse } from "next/server";
import { getTenant } from "@/lib/tenant";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { users, courses, programs } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

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
  const { churchId, programId, name, description, isPublished } = body as {
    churchId: string;
    programId: string;
    name: string;
    description?: string;
    isPublished?: boolean;
  };
  if (churchId !== tenant.churchId || !programId || !name) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const [created] = await db.insert(courses).values({
    churchId,
    programId,
    name,
    description: description ?? null,
    isPublished: isPublished ?? false,
  }).returning({ id: courses.id });
  return NextResponse.json({ id: created?.id });
}

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
  if (u?.role !== "church_admin" || u.churchId !== tenant.churchId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await request.json();
  const { courseId, name, description, isPublished } = body as {
    courseId: string;
    name?: string;
    description?: string;
    isPublished?: boolean;
  };
  if (!courseId) return NextResponse.json({ error: "courseId required" }, { status: 400 });
  await db.update(courses).set({
    ...(name != null && { name }),
    ...(description != null && { description }),
    ...(isPublished != null && { isPublished }),
    updatedAt: new Date(),
  }).where(and(eq(courses.id, courseId), eq(courses.churchId, tenant.churchId)));
  return NextResponse.json({ ok: true });
}
