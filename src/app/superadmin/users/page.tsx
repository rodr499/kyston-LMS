import { db } from "@/lib/db";
import { users, churches } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export default async function SuperAdminUsersPage() {
  const list = await db.query.users.findMany({
    orderBy: [desc(users.createdAt)],
    columns: {
      id: true,
      email: true,
      fullName: true,
      role: true,
      churchId: true,
      isActive: true,
      createdAt: true,
    },
  });
  const churchIds = [...new Set(list.map((u) => u.churchId).filter(Boolean))] as string[];
  const churchMap = new Map<string, string>();
  for (const cid of churchIds) {
    const c = await db.query.churches.findFirst({
      where: eq(churches.id, cid),
      columns: { name: true, subdomain: true },
    });
    if (c) churchMap.set(cid, `${c.name} (${c.subdomain})`);
  }

  const roleBadge = (role: string) => {
    if (role === "super_admin") return <span className="badge badge-accent badge-sm font-body">Super Admin</span>;
    if (role === "church_admin") return <span className="badge badge-primary badge-sm font-body">Admin</span>;
    if (role === "facilitator") return <span className="badge badge-secondary badge-sm font-body">Facilitator</span>;
    return <span className="badge badge-ghost badge-sm font-body">Student</span>;
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-bold text-base-content">Users</h1>
        <p className="text-base-content/60 font-body mt-1">All users across tenants.</p>
      </div>
      <div className="card bg-white shadow-sm rounded-2xl border border-[#e5e7eb] overflow-hidden">
        <div className="card-body p-0">
          <div className="p-6 border-b border-base-300">
            <h3 className="font-heading text-lg font-semibold">All users</h3>
          </div>
          <div className="table-responsive-card overflow-x-auto">
            <table className="table table-zebra">
              <thead>
                <tr className="bg-base-200 text-base-content/60 text-xs uppercase tracking-widest font-body">
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Church</th>
                  <th>Status</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {list.map((u) => (
                  <tr key={u.id} className="hover:bg-base-200 transition-colors">
                    <td data-label="Name" className="font-body font-medium">{u.fullName}</td>
                    <td data-label="Email" className="font-body text-base-content/70">{u.email}</td>
                    <td data-label="Role">{roleBadge(u.role)}</td>
                    <td data-label="Church" className="font-body text-sm">{u.churchId ? churchMap.get(u.churchId) ?? "—" : "—"}</td>
                    <td data-label="Status">
                      {u.isActive ? (
                        <span className="badge badge-success gap-1 font-body text-xs">Active</span>
                      ) : (
                        <span className="badge badge-ghost font-body text-xs">Inactive</span>
                      )}
                    </td>
                    <td data-label="Created" className="font-body text-base-content/70">{new Date(u.createdAt).toLocaleDateString()}</td>
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
