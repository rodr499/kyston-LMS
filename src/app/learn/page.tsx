import { getTenant } from "@/lib/tenant";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { enrollments, activityCompletions, activities } from "@/lib/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import Link from "next/link";
import { GraduationCap, BookOpen } from "lucide-react";
import { redirect } from "next/navigation";

export default async function LearnDashboard() {
  const tenant = await getTenant();
  if (!tenant) redirect("/login");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const myEnrollments = await db.query.enrollments.findMany({
    where: and(
      eq(enrollments.churchId, tenant.churchId),
      eq(enrollments.studentId, user.id),
      eq(enrollments.status, "enrolled")
    ),
    with: {
      class: {
        columns: { id: true, name: true },
        with: {
          course: { columns: { name: true } },
        },
      },
    },
  });

  // Batch-fetch all activities and completions in 2 queries instead of N*M
  const classIds = myEnrollments.map((e) => e.class?.id).filter(Boolean) as string[];
  let completedSet = new Set<string>();
  const activitiesByClass = new Map<string, { id: string; classId: string }[]>();

  if (classIds.length) {
    const [allActivities, allCompletions] = await Promise.all([
      db.query.activities.findMany({
        where: inArray(activities.classId, classIds),
        columns: { id: true, classId: true },
      }),
      db
        .select({ activityId: activityCompletions.activityId })
        .from(activityCompletions)
        .innerJoin(activities, eq(activityCompletions.activityId, activities.id))
        .where(
          and(
            inArray(activities.classId, classIds),
            eq(activityCompletions.studentId, user.id),
            eq(activityCompletions.status, "completed")
          )
        ),
    ]);

    completedSet = new Set(allCompletions.map((c) => c.activityId));
    for (const a of allActivities) {
      const list = activitiesByClass.get(a.classId) ?? [];
      list.push(a);
      activitiesByClass.set(a.classId, list);
    }
  }

  const progressList = myEnrollments.map((e) => {
    if (!e.class) return { enrollment: e, completed: 0, total: 0 };
    const classActivities = activitiesByClass.get(e.class.id) ?? [];
    const total = classActivities.length;
    const completed = classActivities.filter((a) => completedSet.has(a.id)).length;
    return { enrollment: e, completed, total };
  });

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  })();

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-bold text-base-content">{greeting} 👋</h1>
        <p className="text-base-content/60 font-body mt-1">Your enrolled classes.</p>
      </div>
      {progressList.length === 0 ? (
        <div className="card bg-white shadow-sm rounded-2xl border border-[#e5e7eb]">
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
              <BookOpen className="w-10 h-10 text-primary/60" />
            </div>
            <h3 className="font-heading text-xl font-semibold text-base-content mb-2">No classes yet</h3>
            <p className="font-body text-base-content/50 text-sm max-w-xs mb-6">
              You are not enrolled in any classes. Browse the Learning Hub to enroll.
            </p>
            <Link href="/" className="btn btn-primary rounded-xl gap-2 font-body">
              <GraduationCap className="w-4 h-4" /> Go to Learning Hub
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {progressList.map(({ enrollment, completed, total }) => {
            const pct = total ? Math.round((completed / total) * 100) : 0;
            return (
              <Link
                key={enrollment.id}
                href={`/learn/classes/${enrollment.class?.id}`}
                className="card bg-white shadow-sm rounded-2xl border border-[#e5e7eb] hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
              >
                <div className="card-body">
                  <h2 className="card-title font-heading text-lg font-semibold">{enrollment.class?.name}</h2>
                  <p className="text-base-content/70 text-sm font-body">{enrollment.class?.course?.name}</p>
                  <div className="w-full mt-2">
                    <div className="flex justify-between mb-1">
                      <span className="font-body text-xs text-base-content/60">Progress</span>
                      <span className="font-body text-xs font-semibold text-primary">{pct}%</span>
                    </div>
                    <progress className="progress progress-primary w-full h-2" value={pct} max="100" />
                  </div>
                  <p className="font-body text-sm text-base-content/70">{completed} / {total} activities</p>
                  <div className="card-actions justify-end mt-2">
                    <span className="btn btn-primary btn-sm rounded-xl font-body">Continue</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
