import { getTenant } from "@/lib/tenant";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { enrollments, activities, activityCompletions } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import ActivityView from "@/components/student/ActivityView";
import { ArrowLeft } from "lucide-react";

export default async function LearnActivityPage({
  params,
}: {
  params: Promise<{ id: string; activityId: string }>;
}) {
  const tenant = await getTenant();
  if (!tenant) return null;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { id: classId, activityId } = await params;
  const enrollment = await db.query.enrollments.findFirst({
    where: and(
      eq(enrollments.classId, classId),
      eq(enrollments.studentId, user.id),
      eq(enrollments.churchId, tenant.churchId),
      eq(enrollments.status, "enrolled")
    ),
  });
  if (!enrollment) notFound();
  const activity = await db.query.activities.findFirst({
    where: and(
      eq(activities.id, activityId),
      eq(activities.classId, classId),
      eq(activities.churchId, tenant.churchId)
    ),
  });
  if (!activity) notFound();
  const completion = await db.query.activityCompletions.findFirst({
    where: and(
      eq(activityCompletions.activityId, activityId),
      eq(activityCompletions.studentId, user.id)
    ),
  });
  return (
    <div>
      <Link
        href={`/learn/classes/${classId}`}
        className="btn btn-ghost btn-sm rounded-xl gap-2 font-body mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Back to class
      </Link>
      <ActivityView
        activity={activity}
        completion={completion ?? null}
        churchId={tenant.churchId}
        studentId={user.id}
      />
    </div>
  );
}
