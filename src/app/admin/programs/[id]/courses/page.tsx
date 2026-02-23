import { getTenant } from "@/lib/tenant";
import { db } from "@/lib/db";
import { programs, courses } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Plus, GraduationCap, BookOpen } from "lucide-react";

export default async function ProgramCoursesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const tenant = await getTenant();
  if (!tenant) return null;
  const { id: programId } = await params;
  const program = await db.query.programs.findFirst({
    where: and(eq(programs.id, programId), eq(programs.churchId, tenant.churchId)),
  });
  if (!program) notFound();
  const courseList = await db.query.courses.findMany({
    where: eq(courses.programId, programId),
    columns: { id: true, name: true, isPublished: true },
  });
  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="font-heading text-3xl font-bold text-base-content">Courses</h1>
          <p className="text-base-content/60 font-body mt-1">{program.name}</p>
        </div>
        <Link href={`/admin/programs/${programId}/courses/new`} className="btn btn-primary rounded-xl gap-2 font-body font-medium">
          <Plus className="w-4 h-4" /> New course
        </Link>
      </div>
      <div className="card bg-white shadow-sm rounded-2xl border border-[#e5e7eb] overflow-hidden">
        <div className="card-body p-0">
          <div className="flex items-center justify-between p-6 border-b border-base-300">
            <h3 className="font-heading text-lg font-semibold">All courses</h3>
            <Link href={`/admin/programs/${programId}/courses/new`} className="btn btn-primary btn-sm rounded-xl gap-2 font-body">
              <Plus className="w-4 h-4" /> Add New
            </Link>
          </div>
          {courseList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                <BookOpen className="w-10 h-10 text-primary/60" />
              </div>
              <h3 className="font-heading text-xl font-semibold text-base-content mb-2">No courses yet</h3>
              <p className="font-body text-base-content/50 text-sm max-w-xs mb-6">
                Add a course to this program.
              </p>
              <Link href={`/admin/programs/${programId}/courses/new`} className="btn btn-primary rounded-xl gap-2 font-body">
                <Plus className="w-4 h-4" /> New course
              </Link>
            </div>
          ) : (
            <div className="table-responsive-card overflow-x-auto">
              <table className="table table-zebra">
                <thead>
                  <tr className="bg-base-200 text-base-content/60 text-xs uppercase tracking-widest font-body">
                    <th>Name</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {courseList.map((c) => (
                    <tr key={c.id} className="hover:bg-base-200 transition-colors">
                      <td data-label="Name" className="font-body font-medium">{c.name}</td>
                      <td data-label="Status">
                        {c.isPublished ? (
                          <span className="badge badge-success gap-1 font-body text-xs">Published</span>
                        ) : (
                          <span className="badge badge-ghost font-body text-xs">Draft</span>
                        )}
                      </td>
                      <td data-label="Actions">
                        <div className="flex gap-2">
                          <Link href={`/admin/programs/${programId}/courses/${c.id}`} className="btn btn-ghost btn-xs rounded-lg font-body">Edit</Link>
                          <Link href={`/admin/programs/${programId}/courses/${c.id}/classes`} className="btn btn-ghost btn-xs rounded-lg gap-1 font-body">
                            <GraduationCap className="w-3.5 h-3.5" /> Classes
                          </Link>
                        </div>
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
