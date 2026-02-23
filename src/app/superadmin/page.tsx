import { db } from "@/lib/db";
import { churches, users } from "@/lib/db/schema";
import { eq, sql, desc } from "drizzle-orm";
import Link from "next/link";
import { Building2, Users, CreditCard, TrendingUp } from "lucide-react";

export default async function SuperAdminDashboard() {
  const [tenantCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(churches)
    .where(eq(churches.isActive, true));
  const [userCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(users);
  const recentChurches = await db.query.churches.findMany({
    orderBy: [desc(churches.createdAt)],
    limit: 5,
    columns: { id: true, name: true, subdomain: true, plan: true, createdAt: true },
  });
  const [subCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(churches)
    .where(sql`${churches.stripeSubscriptionId} is not null`);

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
        <p className="text-base-content/60 font-body mt-1">Platform overview.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
        <div className="stat bg-white rounded-2xl shadow-sm border border-[#e5e7eb]">
          <div className="stat-figure text-primary">
            <Building2 className="w-8 h-8" />
          </div>
          <div className="stat-title text-base-content/60 font-body text-xs uppercase tracking-widest">Active tenants</div>
          <div className="stat-value text-primary font-heading text-3xl">{tenantCount?.count ?? 0}</div>
        </div>
        <div className="stat bg-white rounded-2xl shadow-sm border border-[#e5e7eb]">
          <div className="stat-figure text-secondary">
            <Users className="w-8 h-8" />
          </div>
          <div className="stat-title text-base-content/60 font-body text-xs uppercase tracking-widest">Total users</div>
          <div className="stat-value text-secondary font-heading text-3xl">{userCount?.count ?? 0}</div>
        </div>
        <div className="stat bg-white rounded-2xl shadow-sm border border-[#e5e7eb]">
          <div className="stat-figure text-primary">
            <CreditCard className="w-8 h-8" />
          </div>
          <div className="stat-title text-base-content/60 font-body text-xs uppercase tracking-widest">Subscriptions</div>
          <div className="stat-value text-primary font-heading text-3xl">{subCount?.count ?? 0}</div>
        </div>
        <div className="stat bg-white rounded-2xl shadow-sm border border-[#e5e7eb]">
          <div className="stat-figure text-secondary">
            <TrendingUp className="w-8 h-8" />
          </div>
          <div className="stat-title text-base-content/60 font-body text-xs uppercase tracking-widest">MRR</div>
          <div className="stat-value text-secondary font-heading text-3xl">—</div>
          <div className="stat-desc font-body text-xs">From Stripe</div>
        </div>
      </div>
      <div className="card bg-white shadow-sm rounded-2xl border border-[#e5e7eb] overflow-hidden">
        <div className="card-body p-0">
          <div className="flex items-center justify-between p-6 border-b border-base-300">
            <h3 className="font-heading text-lg font-semibold">Recent signups</h3>
            <Link href="/superadmin/tenants" className="btn btn-primary btn-sm rounded-xl font-body">View all</Link>
          </div>
          <div className="table-responsive-card overflow-x-auto">
            <table className="table table-zebra">
              <thead>
                <tr className="bg-base-200 text-base-content/60 text-xs uppercase tracking-widest font-body">
                  <th>Name</th>
                  <th>Subdomain</th>
                  <th>Plan</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {recentChurches.map((c) => (
                  <tr key={c.id} className="hover:bg-base-200 transition-colors">
                    <td data-label="Name" className="font-body font-medium">{c.name}</td>
                    <td data-label="Subdomain" className="font-body">{c.subdomain}</td>
                    <td data-label="Plan">
                      <span className="badge badge-primary badge-outline font-body text-xs capitalize">{c.plan}</span>
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
