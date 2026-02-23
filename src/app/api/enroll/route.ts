import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { classes, enrollments, users } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { getTenant } from "@/lib/tenant";
import { checkLimit } from "@/lib/tenant-config";

export async function POST(request: Request) {
  const tenant = await getTenant();
  if (!tenant) {
    return NextResponse.json({ error: "Not a tenant context" }, { status: 400 });
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json();
  const classId = body?.classId as string | undefined;
  if (!classId) {
    return NextResponse.json({ error: "classId required" }, { status: 400 });
  }

  const classRow = await db.query.classes.findFirst({
    where: and(
      eq(classes.id, classId),
      eq(classes.churchId, tenant.churchId),
      eq(classes.isPublished, true)
    ),
  });
  if (!classRow) {
    return NextResponse.json({ error: "Class not found" }, { status: 404 });
  }
  if (!classRow.allowSelfEnrollment) {
    return NextResponse.json({ error: "Self-enrollment not allowed for this class" }, { status: 403 });
  }

  const { allowed } = await checkLimit(tenant.churchId, "students");
  if (!allowed) {
    return NextResponse.json({ error: "Church plan limit reached for students" }, { status: 403 });
  }

  const existing = await db.query.enrollments.findFirst({
    where: and(
      eq(enrollments.classId, classId),
      eq(enrollments.studentId, user.id),
      eq(enrollments.churchId, tenant.churchId)
    ),
  });
  if (existing) {
    return NextResponse.json({ error: "Already enrolled" }, { status: 409 });
  }

  await db.insert(enrollments).values({
    churchId: tenant.churchId,
    classId,
    studentId: user.id,
    status: "enrolled",
    enrolledAt: new Date(),
  });
  return NextResponse.json({ success: true });
}
