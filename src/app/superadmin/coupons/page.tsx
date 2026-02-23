import { db } from "@/lib/db";
import { couponCodes } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import Link from "next/link";
import { Plus, Tag, Copy } from "lucide-react";

export default async function CouponsListPage() {
  const list = await db.query.couponCodes.findMany({
    orderBy: [desc(couponCodes.createdAt)],
  });

  const totalCodes = list.length;
  const activeCodes = list.filter((c) => c.isActive).length;
  const totalRedemptions = list.reduce((s, c) => s + (c.currentRedemptions ?? 0), 0);

  return (
    <div>
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="font-heading text-3xl font-bold text-base-content">Coupon Codes</h1>
          <p className="text-base-content/60 font-body mt-1">Create and manage discount codes.</p>
        </div>
        <Link href="/superadmin/coupons/new" className="btn btn-primary rounded-xl gap-2 font-body">
          <Plus className="w-4 h-4" /> Create New Coupon
        </Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="stat bg-white rounded-2xl shadow-sm border border-[#e5e7eb]">
          <div className="stat-figure text-primary">
            <Tag className="w-6 h-6" />
          </div>
          <div className="stat-title text-base-content/60 font-body text-xs uppercase tracking-widest">Total codes</div>
          <div className="stat-value text-primary font-heading text-2xl">{totalCodes}</div>
        </div>
        <div className="stat bg-white rounded-2xl shadow-sm border border-[#e5e7eb]">
          <div className="stat-title text-base-content/60 font-body text-xs uppercase tracking-widest">Active</div>
          <div className="stat-value text-secondary font-heading text-2xl">{activeCodes}</div>
        </div>
        <div className="stat bg-white rounded-2xl shadow-sm border border-[#e5e7eb]">
          <div className="stat-title text-base-content/60 font-body text-xs uppercase tracking-widest">Total redemptions</div>
          <div className="stat-value font-heading text-2xl">{totalRedemptions}</div>
        </div>
      </div>
      <div className="card bg-white shadow-sm rounded-2xl border border-[#e5e7eb] overflow-hidden">
        <div className="card-body p-0">
          <div className="table-responsive-card overflow-x-auto">
            <table className="table table-zebra">
              <thead>
                <tr className="bg-base-200 text-base-content/60 text-xs uppercase tracking-widest font-body">
                  <th>Code</th>
                  <th>Description</th>
                  <th>Grant type</th>
                  <th>Usage</th>
                  <th>Expires</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.map((c) => (
                  <tr key={c.id} className="hover:bg-base-200 transition-colors">
                    <td data-label="Code" className="font-body font-mono font-medium">{c.code}</td>
                    <td data-label="Description" className="font-body text-base-content/70">{c.description ?? "—"}</td>
                    <td data-label="Grant type">
                      <span className="badge badge-primary badge-outline badge-sm font-body capitalize">
                        {c.grantType.replace("_", " ")}
                      </span>
                    </td>
                    <td data-label="Usage" className="font-body">
                      {c.currentRedemptions} / {c.maxRedemptions ?? "∞"}
                    </td>
                    <td data-label="Expires" className="font-body">
                      {c.expiresAt ? new Date(c.expiresAt).toLocaleDateString() : "—"}
                    </td>
                    <td data-label="Status">
                      {c.isActive ? (
                        <span className="badge badge-success gap-1 font-body text-xs">Active</span>
                      ) : (
                        <span className="badge badge-ghost font-body text-xs">Inactive</span>
                      )}
                    </td>
                    <td data-label="Actions">
                      <Link href={`/superadmin/coupons/${c.id}`} className="btn btn-ghost btn-xs rounded-lg font-body">
                        View
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
                <Tag className="w-10 h-10 text-primary/60" />
              </div>
              <h3 className="font-heading text-xl font-semibold text-base-content mb-2">No coupons yet</h3>
              <p className="font-body text-base-content/50 text-sm max-w-xs mb-6">
                Create coupon codes to offer discounts and special access.
              </p>
              <Link href="/superadmin/coupons/new" className="btn btn-primary rounded-xl gap-2 font-body">
                <Plus className="w-4 h-4" /> Create First Coupon
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
