import { NextResponse } from "next/server";
import { getTenant } from "@/lib/tenant";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { activityCompletions, activities, enrollments } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

const VALID_STATUSES = ["not_started", "in_progress", "completed", "failed"] as const;
type ActivityStatus = typeof VALID_STATUSES[number];

export async function POST(request: Request) {
  const tenant = await getTenant();
  if (!tenant) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json();
  const { activityId, studentId, status, responseData } = body as {
    activityId: string;
    studentId: string;
    status: string;
    responseData?: Record<string, unknown>;
  };
  if (studentId !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!activityId) return NextResponse.json({ error: "activityId required" }, { status: 400 });
  if (!VALID_STATUSES.includes(status as ActivityStatus)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }
  const activity = await db.query.activities.findFirst({
    where: and(
      eq(activities.id, activityId),
      eq(activities.churchId, tenant.churchId)
    ),
    columns: { id: true, classId: true },
  });
  if (!activity) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Verify the student is enrolled in the class that contains this activity
  const enrollment = await db.query.enrollments.findFirst({
    where: and(
      eq(enrollments.classId, activity.classId),
      eq(enrollments.studentId, user.id),
      eq(enrollments.churchId, tenant.churchId),
      eq(enrollments.status, "enrolled")
    ),
    columns: { id: true },
  });
  if (!enrollment) return NextResponse.json({ error: "Not enrolled in this class" }, { status: 403 });

  const existing = await db.query.activityCompletions.findFirst({
    where: and(
      eq(activityCompletions.activityId, activityId),
      eq(activityCompletions.studentId, user.id)
    ),
  });
  if (existing) {
    await db.update(activityCompletions).set({
      status: status as ActivityStatus,
      responseData: responseData ?? existing.responseData,
      submittedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(activityCompletions.id, existing.id));
  } else {
    await db.insert(activityCompletions).values({
      churchId: tenant.churchId,
      activityId,
      studentId: user.id,
      status: status as ActivityStatus,
      responseData: responseData ?? null,
      submittedAt: new Date(),
    });
  }
  return NextResponse.json({ ok: true });
}
