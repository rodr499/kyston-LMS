import { getTenant } from "@/lib/tenant";
import { db } from "@/lib/db";
import { programs, courses, classes } from "@/lib/db/schema";
import { and, eq, asc } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { headers } from "next/headers";
import { Plus, CalendarDays } from "lucide-react";
import ClassListFeedback from "@/components/admin/ClassListFeedback";
import ClassesListClient from "@/components/admin/ClassesListClient";

export default async function CourseClassesPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; courseId: string }>;
  searchParams: Promise<{ saved?: string; meeting_error?: string }>;
}) {
  const tenant = await getTenant();
  if (!tenant) return null;
  const { id: programId, courseId } = await params;
  const { saved, meeting_error: meetingError } = await searchParams;
  const program = await db.query.programs.findFirst({
    where: and(eq(programs.id, programId), eq(programs.churchId, tenant.churchId)),
  });
  const course = await db.query.courses.findFirst({
    where: and(eq(courses.id, courseId), eq(courses.churchId, tenant.churchId)),
  });
  if (!program || !course) notFound();
  const classList = await db
    .select({
      id: classes.id,
      name: classes.name,
      isPublished: classes.isPublished,
      allowSelfEnrollment: classes.allowSelfEnrollment,
      noEnrollmentNeeded: classes.noEnrollmentNeeded,
      meetingUrl: classes.meetingUrl,
      meetingPlatform: classes.meetingPlatform,
      sortOrder: classes.sortOrder,
    })
    .from(classes)
    .where(eq(classes.courseId, courseId))
    .orderBy(asc(classes.sortOrder));
  const headersList = await headers();
  const host = headersList.get("host") ?? "";
  const proto = headersList.get("x-forwarded-proto") ?? "http";
  const baseUrl = host ? `${proto}://${host}` : "";
  return (
    <div>
      <ClassListFeedback saved={saved} meetingError={meetingError} />
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="font-heading text-3xl font-bold text-base-content">Classes</h1>
          <p className="text-base-content/60 font-body mt-1">{course.name}</p>
        </div>
        <Link href={`/admin/programs/${programId}/courses/${courseId}/classes/new`} className="btn btn-primary rounded-xl gap-2 font-body font-medium">
          <Plus className="w-4 h-4" /> New class
        </Link>
      </div>
      <div className="card bg-white shadow-sm rounded-2xl border border-[#e5e7eb] overflow-hidden">
        <div className="card-body p-0">
          <div className="flex items-center justify-between p-6 border-b border-base-300">
            <h3 className="font-heading text-lg font-semibold">All classes</h3>
            <Link href={`/admin/programs/${programId}/courses/${courseId}/classes/new`} className="btn btn-primary btn-sm rounded-xl gap-2 font-body">
              <Plus className="w-4 h-4" /> Add New
            </Link>
          </div>
          {classList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                <CalendarDays className="w-10 h-10 text-primary/60" />
              </div>
              <h3 className="font-heading text-xl font-semibold text-base-content mb-2">No classes yet</h3>
              <p className="font-body text-base-content/50 text-sm max-w-xs mb-6">
                Create a class to start enrolling students.
              </p>
              <Link href={`/admin/programs/${programId}/courses/${courseId}/classes/new`} className="btn btn-primary rounded-xl gap-2 font-body">
                <Plus className="w-4 h-4" /> New class
              </Link>
            </div>
          ) : (
            <ClassesListClient
              initialClasses={classList}
              programId={programId}
              courseId={courseId}
              churchId={tenant.churchId}
              baseUrl={baseUrl}
            />
          )}
        </div>
      </div>
    </div>
  );
}
