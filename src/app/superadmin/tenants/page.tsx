import { db } from "@/lib/db";
import { churches, users } from "@/lib/db/schema";
import { and, eq, sql, desc } from "drizzle-orm";
import Link from "next/link";

export default async function TenantsPage() {
  const list = await db.query.churches.findMany({
    orderBy: [desc(churches.createdAt)],
    columns: {
      id: true,
      name: true,
      subdomain: true,
      plan: true,
      isActive: true,
      createdAt: true,
    },
  });
  const stats = await Promise.all(
    list.map(async (c) => {
      const [studentCount] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(users)
        .where(and(eq(users.churchId, c.id), eq(users.role, "student")));
      const [facCount] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(users)
        .where(and(eq(users.churchId, c.id), eq(users.role, "facilitator")));
      return {
        ...c,
        studentCount: studentCount?.count ?? 0,
        facilitatorCount: facCount?.count ?? 0,
      };
    })
  );
  return (
    <div>
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-bold text-base-content">Tenants</h1>
        <p className="text-base-content/60 font-body mt-1">All churches on the platform.</p>
      </div>
      <div className="card bg-white shadow-sm rounded-2xl border border-[#e5e7eb] overflow-hidden">
        <div className="card-body p-0">
          <div className="p-6 border-b border-base-300">
            <h3 className="font-heading text-lg font-semibold">All tenants</h3>
          </div>
          <div className="table-responsive-card overflow-x-auto">
            <table className="table table-zebra">
              <thead>
                <tr className="bg-base-200 text-base-content/60 text-xs uppercase tracking-widest font-body">
                  <th>Name</th>
                  <th>Subdomain</th>
                  <th>Plan</th>
                  <th>Students</th>
                  <th>Facilitators</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {stats.map((c) => (
                  <tr key={c.id} className="hover:bg-base-200 transition-colors">
                    <td data-label="Name" className="font-body font-medium">{c.name}</td>
                    <td data-label="Subdomain" className="font-body">{c.subdomain}</td>
                    <td data-label="Plan">
                      <span className="badge badge-primary badge-outline font-body text-xs capitalize">{c.plan}</span>
                    </td>
                    <td data-label="Students" className="font-body">{c.studentCount}</td>
                    <td data-label="Facilitators" className="font-body">{c.facilitatorCount}</td>
                    <td data-label="Status">
                      {c.isActive ? (
                        <span className="badge badge-success gap-1 font-body text-xs">Active</span>
                      ) : (
                        <span className="badge badge-ghost font-body text-xs">Inactive</span>
                      )}
                    </td>
                    <td data-label="Created" className="font-body text-base-content/70">{new Date(c.createdAt).toLocaleDateString()}</td>
                    <td data-label="Actions">
                      <Link href={`/superadmin/tenants/${c.id}`} className="btn btn-ghost btn-xs rounded-lg font-body">View</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
