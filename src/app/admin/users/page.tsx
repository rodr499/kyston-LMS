import { getTenant } from "@/lib/tenant";
import { db } from "@/lib/db";
import { users, enrollments } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import Link from "next/link";
import { Plus, Users as UsersIcon } from "lucide-react";

export default async function AdminUsersPage() {
  const tenant = await getTenant();
  if (!tenant) return null;
  const list = await db.query.users.findMany({
    where: eq(users.churchId, tenant.churchId),
    columns: { id: true, email: true, fullName: true, role: true, isActive: true },
  });
  const enrollmentCounts = await Promise.all(
    list.map(async (u) => {
      const [c] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(enrollments)
        .where(eq(enrollments.studentId, u.id));
      return { userId: u.id, count: c?.count ?? 0 };
    })
  );
  const countMap = new Map(enrollmentCounts.map((e) => [e.userId, e.count]));

  const roleBadge = (role: string) => {
    if (role === "church_admin") return <span className="badge badge-primary badge-sm font-body">Admin</span>;
    if (role === "facilitator") return <span className="badge badge-secondary badge-sm font-body">Facilitator</span>;
    return <span className="badge badge-ghost badge-sm font-body">Student</span>;
  };

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center mb-6 md:mb-8">
        <div>
          <h1 className="font-heading text-3xl font-bold text-base-content">Users</h1>
          <p className="text-base-content/60 font-body mt-1">Manage church members and their roles.</p>
        </div>
        <Link href="/admin/users/invite" className="btn btn-primary rounded-xl gap-2 font-body font-medium">
          <Plus className="w-4 h-4" /> Invite user
        </Link>
      </div>
      <div className="card bg-white shadow-sm rounded-2xl border border-[#e5e7eb] overflow-hidden">
        <div className="card-body p-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 sm:p-6 border-b border-base-300">
            <h3 className="font-heading text-lg font-semibold">All users</h3>
            <Link href="/admin/users/invite" className="btn btn-primary btn-sm rounded-xl gap-2 font-body">
              <Plus className="w-4 h-4" /> Add New
            </Link>
          </div>
          {list.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                <UsersIcon className="w-10 h-10 text-primary/60" />
              </div>
              <h3 className="font-heading text-xl font-semibold text-base-content mb-2">No users yet</h3>
              <p className="font-body text-base-content/50 text-sm max-w-xs mb-6">
                Invite facilitators and students to your church workspace.
              </p>
              <Link href="/admin/users/invite" className="btn btn-primary rounded-xl gap-2 font-body">
                <Plus className="w-4 h-4" /> Invite User
              </Link>
            </div>
          ) : (
            <div className="table-responsive-card overflow-x-auto">
              <table className="table table-zebra">
                <thead>
                  <tr className="bg-base-200 text-base-content/60 text-xs uppercase tracking-widest font-body">
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Enrollments</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((u) => (
                    <tr key={u.id} className="hover:bg-base-200 transition-colors">
                      <td data-label="Name" className="font-body font-medium">{u.fullName}</td>
                      <td data-label="Email" className="font-body text-base-content/70">{u.email}</td>
                      <td data-label="Role">{roleBadge(u.role)}</td>
                      <td data-label="Enrollments" className="font-body">{countMap.get(u.id) ?? 0}</td>
                      <td data-label="Status">
                        {u.isActive ? (
                          <span className="badge badge-success gap-1 font-body text-xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-white inline-block" />
                            Active
                          </span>
                        ) : (
                          <span className="badge badge-ghost font-body text-xs">Inactive</span>
                        )}
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
