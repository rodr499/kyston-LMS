import { NextResponse } from "next/server";
import { getTenant } from "@/lib/tenant";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { activityCompletions, activities } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

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
  const activity = await db.query.activities.findFirst({
    where: and(
      eq(activities.id, activityId),
      eq(activities.churchId, tenant.churchId)
    ),
  });
  if (!activity) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const existing = await db.query.activityCompletions.findFirst({
    where: and(
      eq(activityCompletions.activityId, activityId),
      eq(activityCompletions.studentId, user.id)
    ),
  });
  if (existing) {
    await db.update(activityCompletions).set({
      status: status as "not_started" | "in_progress" | "completed" | "failed",
      responseData: responseData ?? existing.responseData,
      submittedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(activityCompletions.id, existing.id));
  } else {
    await db.insert(activityCompletions).values({
      churchId: tenant.churchId,
      activityId,
      studentId: user.id,
      status: status as "not_started" | "in_progress" | "completed" | "failed",
      responseData: responseData ?? null,
      submittedAt: new Date(),
    });
  }
  return NextResponse.json({ ok: true });
}
