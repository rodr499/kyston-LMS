import { db } from "@/lib/db";
import { plans } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import Link from "next/link";
import { Plus, Package } from "lucide-react";

export default async function PlansListPage() {
  const list = await db.query.plans.findMany({
    orderBy: [asc(plans.sortOrder), asc(plans.name)],
  });

  const formatPrice = (val: string | null) => {
    if (val == null) return "Free";
    const n = parseFloat(val);
    return n === 0 ? "Free" : `$${n}`;
  };

  const formatLimit = (val: number) => (val === -1 || val === Infinity ? "∞" : val);

  return (
    <div>
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="font-heading text-3xl font-bold text-base-content">Plans</h1>
          <p className="text-base-content/60 font-body mt-1">Manage subscription tiers and limits.</p>
        </div>
        <Link href="/superadmin/plans/new" className="btn btn-primary rounded-xl gap-2 font-body">
          <Plus className="w-4 h-4" /> Create New Plan
        </Link>
      </div>
      <div className="card bg-white shadow-sm rounded-2xl border border-[#e5e7eb] overflow-hidden">
        <div className="card-body p-0">
          <div className="table-responsive-card overflow-x-auto">
            <table className="table table-zebra">
              <thead>
                <tr className="bg-base-200 text-base-content/60 text-xs uppercase tracking-widest font-body">
                  <th>Name</th>
                  <th>Slug</th>
                  <th>Public</th>
                  <th>Price</th>
                  <th>Facilitators</th>
                  <th>Students</th>
                  <th>Integrations</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.map((p) => (
                  <tr key={p.id} className="hover:bg-base-200 transition-colors">
                    <td data-label="Name" className="font-body font-medium">{p.name}</td>
                    <td data-label="Slug" className="font-body text-base-content/70">{p.slug}</td>
                    <td data-label="Public">
                      {p.isPublic ? (
                        <span className="badge badge-ghost badge-sm font-body">Public</span>
                      ) : (
                        <span className="badge badge-primary badge-outline badge-sm font-body">Private</span>
                      )}
                    </td>
                    <td data-label="Price" className="font-body">{formatPrice(p.priceMonthly)}</td>
                    <td data-label="Facilitators" className="font-body">{formatLimit(p.maxFacilitators)}</td>
                    <td data-label="Students" className="font-body">{formatLimit(p.maxStudents)}</td>
                    <td data-label="Integrations" className="font-body">{p.integrationsMode}</td>
                    <td data-label="Status">
                      {p.isActive ? (
                        <span className="badge badge-success gap-1 font-body text-xs">
                          <span className="w-1.5 h-1.5 rounded-full bg-white inline-block" />
                          Active
                        </span>
                      ) : (
                        <span className="badge badge-ghost font-body text-xs">Inactive</span>
                      )}
                    </td>
                    <td data-label="Actions">
                      <Link href={`/superadmin/plans/${p.id}/edit`} className="btn btn-ghost btn-xs rounded-lg font-body">
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {list.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                <Package className="w-10 h-10 text-primary/60" />
              </div>
              <h3 className="font-heading text-xl font-semibold text-base-content mb-2">No plans yet</h3>
              <p className="font-body text-base-content/50 text-sm max-w-xs mb-6">
                Create your first plan to define subscription tiers.
              </p>
              <Link href="/superadmin/plans/new" className="btn btn-primary rounded-xl gap-2 font-body">
                <Plus className="w-4 h-4" /> Create First Plan
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
