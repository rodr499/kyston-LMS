import { getTenant } from "@/lib/tenant";
import { getChurchById } from "@/lib/db/queries/churches";
import { db } from "@/lib/db";
import { and, eq } from "drizzle-orm";
import { getTenantLimits, checkLimit } from "@/lib/tenant-config";
import { redirect } from "next/navigation";
import { CreditCard, TrendingUp } from "lucide-react";
import RedeemCouponForm from "./RedeemCouponForm";
import { couponRedemptions } from "@/lib/db/schema";

export default async function AdminBillingPage() {
  const tenant = await getTenant();
  if (!tenant) redirect("/");
  const church = await getChurchById(tenant.churchId);
  if (!church) redirect("/");
  const limits = await getTenantLimits(tenant.churchId);
  const { current: students, max: studentMax } = await checkLimit(tenant.churchId, "students");
  const { current: facilitators, max: facMax } = await checkLimit(tenant.churchId, "facilitators");
  const studentPct = studentMax === Infinity ? 0 : Math.min(100, (students / studentMax) * 100);
  const facPct = facMax === Infinity ? 0 : Math.min(100, (facilitators / facMax) * 100);

  const activeRedemptions = await db.query.couponRedemptions.findMany({
    where: and(eq(couponRedemptions.churchId, tenant.churchId), eq(couponRedemptions.isActive, true)),
  });

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-bold text-base-content">Billing</h1>
        <p className="text-base-content/60 font-body mt-1">Plan usage and upgrade options.</p>
      </div>
      <div className="card bg-white shadow-sm rounded-2xl border border-[#e5e7eb] max-w-2xl">
        <div className="card-body gap-6">
          <div className="flex items-center gap-3">
            <div className="stat-figure text-primary">
              <CreditCard className="w-8 h-8" />
            </div>
            <div>
              <h2 className="font-heading text-xl font-bold">Current plan</h2>
              <span className="badge badge-primary badge-outline font-body">
                {limits.sourceDetail ?? limits.source}
              </span>
              {limits.expiresAt && (
                <p className="text-xs text-base-content/60 mt-1">Expires {limits.expiresAt.toLocaleDateString()}</p>
              )}
            </div>
          </div>
          <div className="space-y-4 pt-4 border-t border-base-300">
            <div>
              <div className="flex justify-between mb-1">
                <span className="font-body text-sm text-base-content/60">Students</span>
                <span className="font-body text-sm font-semibold text-primary">
                  {students} / {studentMax === Infinity ? "Unlimited" : studentMax}
                </span>
              </div>
              <progress className="progress progress-primary w-full h-2" value={studentPct || students} max="100" />
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="font-body text-sm text-base-content/60">Facilitators</span>
                <span className="font-body text-sm font-semibold text-primary">
                  {facilitators} / {facMax === Infinity ? "Unlimited" : facMax}
                </span>
              </div>
              <progress className="progress progress-primary w-full h-2" value={facPct || facilitators} max="100" />
            </div>
          </div>
          {activeRedemptions.length > 0 && (
            <div className="pt-4 border-t border-base-300">
              <h3 className="font-heading font-semibold text-sm mb-2">Active coupon(s)</h3>
              <ul className="font-body text-sm space-y-1">
                {activeRedemptions.map((r) => (
                  <li key={r.id}>
                    Redeemed {r.redeemedAt && new Date(r.redeemedAt).toLocaleDateString()}
                    {r.expiresAt && ` — Expires ${new Date(r.expiresAt).toLocaleDateString()}`}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="pt-4 border-t border-base-300">
            <h3 className="font-heading font-semibold text-sm mb-2">Redeem a code</h3>
            <RedeemCouponForm churchId={tenant.churchId} />
          </div>
          <div className="card-actions justify-end pt-4 border-t border-base-300">
            <a href="/api/stripe/checkout" className="btn btn-primary rounded-xl gap-2 font-body">
              <TrendingUp className="w-4 h-4" /> Upgrade plan
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
