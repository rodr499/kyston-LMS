import { getTenant } from "@/lib/tenant";
import { db } from "@/lib/db";
import { programs, courses, classes } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Plus, CalendarDays } from "lucide-react";
import ClassListFeedback from "@/components/admin/ClassListFeedback";

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
  const classList = await db.query.classes.findMany({
    where: eq(classes.courseId, courseId),
    columns: { id: true, name: true, isPublished: true, allowSelfEnrollment: true },
  });
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
            <div className="table-responsive-card overflow-x-auto">
              <table className="table table-zebra">
                <thead>
                  <tr className="bg-base-200 text-base-content/60 text-xs uppercase tracking-widest font-body">
                    <th>Name</th>
                    <th>Self-enroll</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {classList.map((c) => (
                    <tr key={c.id} className="hover:bg-base-200 transition-colors">
                      <td data-label="Name" className="font-body font-medium">{c.name}</td>
                      <td data-label="Self-enroll" className="font-body">{c.allowSelfEnrollment ? "Yes" : "No"}</td>
                      <td data-label="Status">
                        {c.isPublished ? (
                          <span className="badge badge-success gap-1 font-body text-xs">Published</span>
                        ) : (
                          <span className="badge badge-ghost font-body text-xs">Draft</span>
                        )}
                      </td>
                      <td data-label="Actions">
                        <Link href={`/admin/programs/${programId}/courses/${courseId}/classes/${c.id}`} className="btn btn-ghost btn-xs rounded-lg font-body">Edit</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
