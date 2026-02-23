import { db } from "@/lib/db";
import { couponCodes, couponRedemptions, churches, users } from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Tag } from "lucide-react";

export default async function CouponDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const coupon = await db.query.couponCodes.findFirst({
    where: eq(couponCodes.id, id),
  });
  if (!coupon) notFound();

  const redemptionRows = await db
    .select()
    .from(couponRedemptions)
    .where(eq(couponRedemptions.couponId, id));

  const churchIds = [...new Set(redemptionRows.map((r) => r.churchId))];
  const userIds = [...new Set(redemptionRows.map((r) => r.redeemedBy))];
  const churchMap = new Map<string, string>();
  const userMap = new Map<string, string>();
  if (churchIds.length > 0) {
    const churchList = await db.select({ id: churches.id, name: churches.name }).from(churches).where(inArray(churches.id, churchIds));
    for (const c of churchList) churchMap.set(c.id, c.name);
  }
  if (userIds.length > 0) {
    const userList = await db.select({ id: users.id, fullName: users.fullName }).from(users).where(inArray(users.id, userIds));
    for (const u of userList) userMap.set(u.id, u.fullName);
  }

  const redemptions = redemptionRows.map((r) => ({
    ...r,
    churchName: churchMap.get(r.churchId) ?? "—",
    redeemerName: userMap.get(r.redeemedBy) ?? "—",
  }));

  return (
    <div>
      <div className="flex items-center gap-4 mb-8">
        <Link href="/superadmin/coupons" className="btn btn-ghost btn-sm rounded-xl">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="font-heading text-3xl font-bold text-base-content font-mono">{coupon.code}</h1>
          <p className="text-base-content/60 font-body mt-1">{coupon.description ?? "No description"}</p>
        </div>
      </div>
      <div className="grid gap-6 md:grid-cols-2 mb-8">
        <div className="card bg-white shadow-sm rounded-2xl border border-[#e5e7eb]">
          <div className="card-body">
            <h2 className="font-heading text-lg font-semibold">Details</h2>
            <dl className="font-body space-y-2 text-sm">
              <div>
                <dt className="text-base-content/60">Grant type</dt>
                <dd className="font-medium capitalize">{coupon.grantType.replace("_", " ")}</dd>
              </div>
              <div>
                <dt className="text-base-content/60">Duration</dt>
                <dd className="font-medium">{coupon.durationType} {coupon.durationValue ? `(${coupon.durationValue})` : ""}</dd>
              </div>
              <div>
                <dt className="text-base-content/60">Usage</dt>
                <dd className="font-medium">{coupon.currentRedemptions} / {coupon.maxRedemptions ?? "∞"} redemptions</dd>
              </div>
              <div>
                <dt className="text-base-content/60">Expires</dt>
                <dd className="font-medium">{coupon.expiresAt ? new Date(coupon.expiresAt).toLocaleString() : "Never"}</dd>
              </div>
              <div>
                <dt className="text-base-content/60">Status</dt>
                <dd>
                  {coupon.isActive ? (
                    <span className="badge badge-success badge-sm">Active</span>
                  ) : (
                    <span className="badge badge-ghost badge-sm">Inactive</span>
                  )}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
      <div className="card bg-white shadow-sm rounded-2xl border border-[#e5e7eb] overflow-hidden">
        <div className="card-body p-0">
          <div className="p-6 border-b border-base-300">
            <h3 className="font-heading text-lg font-semibold">Redemption history</h3>
          </div>
          <div className="table-responsive-card overflow-x-auto">
            <table className="table table-zebra">
              <thead>
                <tr className="bg-base-200 text-base-content/60 text-xs uppercase tracking-widest font-body">
                  <th>Church</th>
                  <th>Redeemed by</th>
                  <th>Redeemed at</th>
                  <th>Expires at</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {redemptions.map((r) => (
                  <tr key={r.id} className="hover:bg-base-200 transition-colors">
                    <td data-label="Church" className="font-body font-medium">{r.churchName ?? "—"}</td>
                    <td data-label="Redeemed by" className="font-body">{r.redeemerName ?? "—"}</td>
                    <td data-label="Redeemed at" className="font-body">{r.redeemedAt ? new Date(r.redeemedAt).toLocaleString() : "—"}</td>
                    <td data-label="Expires at" className="font-body">{r.expiresAt ? new Date(r.expiresAt).toLocaleString() : "—"}</td>
                    <td data-label="Status">
                      {r.isActive ? (
                        <span className="badge badge-success badge-sm">Active</span>
                      ) : (
                        <span className="badge badge-ghost badge-sm">Revoked</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {redemptions.length === 0 && (
            <div className="p-8 text-center font-body text-base-content/50">No redemptions yet.</div>
          )}
        </div>
      </div>
    </div>
  );
}
