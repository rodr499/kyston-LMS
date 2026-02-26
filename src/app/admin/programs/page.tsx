import { getTenant } from "@/lib/tenant";
import { db } from "@/lib/db";
import { programs } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { Plus, BookOpen, Pencil, GraduationCap } from "lucide-react";
import { redirect } from "next/navigation";

export default async function AdminProgramsPage() {
  const tenant = await getTenant();
  if (!tenant) redirect("/login");
  const list = await db.query.programs.findMany({
    where: eq(programs.churchId, tenant.churchId),
    columns: { id: true, name: true, isPublished: true, createdAt: true },
  });

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center mb-6 md:mb-8">
        <div>
          <h1 className="font-heading text-3xl font-bold text-base-content">Programs</h1>
          <p className="text-base-content/60 font-body mt-1">Manage learning programs and their courses.</p>
        </div>
        <Link href="/admin/programs/new" className="btn btn-primary rounded-xl gap-2 font-body font-medium">
          <Plus className="w-4 h-4" /> New program
        </Link>
      </div>
      <div className="card bg-white shadow-sm rounded-2xl border border-[#e5e7eb] overflow-hidden">
        <div className="card-body p-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 sm:p-6 border-b border-base-300">
            <h3 className="font-heading text-lg font-semibold">All programs</h3>
            <Link href="/admin/programs/new" className="btn btn-primary btn-sm rounded-xl gap-2 font-body">
              <Plus className="w-4 h-4" /> Add New
            </Link>
          </div>
          {list.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                <BookOpen className="w-10 h-10 text-primary/60" />
              </div>
              <h3 className="font-heading text-xl font-semibold text-base-content mb-2">No programs yet</h3>
              <p className="font-body text-base-content/50 text-sm max-w-xs mb-6">
                Create your first learning program to get started with Kyston LMS.
              </p>
              <Link href="/admin/programs/new" className="btn btn-primary rounded-xl gap-2 font-body">
                <Plus className="w-4 h-4" /> Create First Program
              </Link>
            </div>
          ) : (
            <div className="table-responsive-card overflow-x-auto">
              <table className="table table-zebra">
                <thead>
                  <tr className="bg-base-200 text-base-content/60 text-xs uppercase tracking-widest font-body">
                    <th>Name</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((p) => (
                    <tr key={p.id} className="hover:bg-base-200 transition-colors">
                      <td data-label="Name" className="font-body font-medium">{p.name}</td>
                      <td data-label="Status">
                        {p.isPublished ? (
                          <span className="badge badge-success gap-1.5 font-body text-xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-white inline-block" />
                            Published
                          </span>
                        ) : (
                          <span className="badge badge-ghost font-body text-xs">Draft</span>
                        )}
                      </td>
                      <td data-label="Created" className="font-body text-base-content/70">{new Date(p.createdAt).toLocaleDateString()}</td>
                      <td data-label="Actions">
                        <div className="flex flex-wrap gap-2">
                          <Link href={`/admin/programs/${p.id}`} className="btn btn-ghost btn-xs rounded-lg font-body">Edit</Link>
                          <Link href={`/admin/programs/${p.id}/courses`} className="btn btn-ghost btn-xs rounded-lg gap-1 font-body">
                            <GraduationCap className="w-3.5 h-3.5" /> Courses
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
