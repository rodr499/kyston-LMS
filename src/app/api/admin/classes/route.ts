import { NextResponse } from "next/server";
import { getTenant } from "@/lib/tenant";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { users, classes, courses } from "@/lib/db/schema";
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
  const {
    churchId,
    courseId,
    name,
    mode,
    gradingSystem,
    facilitatorId,
    allowSelfEnrollment,
    isPublished,
    meetingPlatform,
    meetingUrl,
    meetingScheduledAt,
  } = body as {
    churchId: string;
    courseId: string;
    name: string;
    mode?: string;
    gradingSystem?: string;
    facilitatorId?: string | null;
    allowSelfEnrollment?: boolean;
    isPublished?: boolean;
    meetingPlatform?: string;
    meetingUrl?: string | null;
    meetingScheduledAt?: string | null;
  };
  if (churchId !== tenant.churchId || !courseId || !name) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const [created] = await db.insert(classes).values({
    churchId,
    courseId,
    name,
    mode: (mode as "on_demand" | "academic") ?? "on_demand",
    gradingSystem: (gradingSystem as "completion" | "pass_fail" | "letter_grade") ?? "completion",
    facilitatorId: facilitatorId ?? null,
    allowSelfEnrollment: allowSelfEnrollment ?? false,
    isPublished: isPublished ?? false,
    meetingPlatform: (meetingPlatform as "none" | "zoom" | "teams" | "google_meet") ?? "none",
    meetingUrl: meetingUrl ?? null,
    meetingScheduledAt: meetingScheduledAt ? new Date(meetingScheduledAt) : null,
  }).returning({ id: classes.id });
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
  const { classId, name, mode, gradingSystem, facilitatorId, allowSelfEnrollment, isPublished, meetingPlatform, meetingUrl, meetingScheduledAt } = body as Record<string, unknown>;
  if (!classId) return NextResponse.json({ error: "classId required" }, { status: 400 });
  await db.update(classes).set({
    ...(name != null && { name: name as string }),
    ...(mode != null && { mode: mode as "on_demand" | "academic" }),
    ...(gradingSystem != null && { gradingSystem: gradingSystem as "completion" | "pass_fail" | "letter_grade" }),
    ...(facilitatorId !== undefined && { facilitatorId: facilitatorId as string | null }),
    ...(allowSelfEnrollment != null && { allowSelfEnrollment: allowSelfEnrollment as boolean }),
    ...(isPublished != null && { isPublished: isPublished as boolean }),
    ...(meetingPlatform != null && { meetingPlatform: meetingPlatform as "none" | "zoom" | "teams" | "google_meet" }),
    ...(meetingUrl !== undefined && { meetingUrl: meetingUrl as string | null }),
    ...(meetingScheduledAt !== undefined && { meetingScheduledAt: meetingScheduledAt ? new Date(meetingScheduledAt as string) : null }),
    updatedAt: new Date(),
  }).where(and(eq(classes.id, classId as string), eq(classes.churchId, tenant.churchId)));
  return NextResponse.json({ ok: true });
}
