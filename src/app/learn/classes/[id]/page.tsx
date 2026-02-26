import { getTenant } from "@/lib/tenant";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { classes, enrollments, activities, activityCompletions } from "@/lib/db/schema";
import { and, eq, asc, inArray } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Video, UserCheck, ListTodo, CheckCircle, Circle } from "lucide-react";

export default async function LearnClassPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const tenant = await getTenant();
  if (!tenant) redirect("/login");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { id } = await params;
  const enrollment = await db.query.enrollments.findFirst({
    where: and(
      eq(enrollments.classId, id),
      eq(enrollments.studentId, user.id),
      eq(enrollments.churchId, tenant.churchId),
      eq(enrollments.status, "enrolled")
    ),
    columns: { id: true },
  });
  if (!enrollment) notFound();
  const cls = await db.query.classes.findFirst({
    where: and(eq(classes.id, id), eq(classes.churchId, tenant.churchId)),
    with: {
      course: { columns: { name: true } },
      facilitator: { columns: { fullName: true } },
    },
  });
  if (!cls) notFound();
  const activityList = await db.query.activities.findMany({
    where: and(eq(activities.classId, id), eq(activities.churchId, tenant.churchId)),
    orderBy: [asc(activities.orderIndex)],
    columns: { id: true, title: true, type: true, orderIndex: true },
  });

  // Batch-fetch all completions in a single query instead of one per activity
  const activityIds = activityList.map((a) => a.id);
  const completions = activityIds.length
    ? await db
        .select({ activityId: activityCompletions.activityId, status: activityCompletions.status })
        .from(activityCompletions)
        .where(
          and(
            inArray(activityCompletions.activityId, activityIds),
            eq(activityCompletions.studentId, user.id)
          )
        )
    : [];

  const statusMap = new Map(completions.map((c) => [c.activityId, c.status]));
  const completionStatus = activityList.map((a) => ({
    activityId: a.id,
    status: statusMap.get(a.id) ?? "not_started",
  }));
  const completedCount = completionStatus.filter((s) => s.status === "completed").length;
  const progressPct = activityList.length ? Math.round((completedCount / activityList.length) * 100) : 0;

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-bold text-base-content">{cls.name}</h1>
        <p className="text-base-content/60 font-body mt-1">Course: {cls.course?.name}</p>
        {cls.facilitator && (
          <p className="font-body text-sm text-base-content/70 mt-1 flex items-center gap-1">
            <UserCheck className="w-4 h-4" /> {cls.facilitator.fullName}
          </p>
        )}
      </div>
      {cls.meetingUrl && (
        <a
          href={cls.meetingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-secondary rounded-xl gap-2 font-body mb-8"
        >
          <Video className="w-4 h-4" /> Join meeting
        </a>
      )}
      <div className="mb-6">
        <div className="flex justify-between mb-1">
          <span className="font-body text-sm text-base-content/60">Progress</span>
          <span className="font-body text-sm font-semibold text-primary">{progressPct}%</span>
        </div>
        <progress className="progress progress-primary w-full h-2" value={progressPct} max="100" />
      </div>
      <div className="card bg-white shadow-sm rounded-2xl border border-[#e5e7eb] overflow-hidden">
        <div className="card-body p-0">
          <div className="flex items-center gap-3 p-6 border-b border-base-300">
            <ListTodo className="w-6 h-6 text-primary" />
            <h2 className="font-heading text-lg font-semibold">Activities</h2>
          </div>
          <ul className="divide-y divide-base-300">
            {activityList.map((a) => {
              const done = statusMap.get(a.id) === "completed";
              return (
                <li key={a.id} className="hover:bg-base-200 transition-colors">
                  <Link
                    href={`/learn/classes/${id}/activities/${a.id}`}
                    className="flex items-center gap-4 p-4"
                  >
                    {done ? (
                      <CheckCircle className="w-5 h-5 text-success shrink-0" />
                    ) : (
                      <Circle className="w-5 h-5 text-base-300 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-body font-medium">{a.title}</p>
                      <p className="text-base-content/50 text-xs font-body capitalize">{a.type}</p>
                    </div>
                    <span className={`badge ${done ? "badge-success gap-1" : "badge-ghost"} font-body text-xs`}>
                      {done ? "Done" : "To do"}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
