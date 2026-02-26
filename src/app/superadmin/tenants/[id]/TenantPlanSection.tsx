import { getTenantLimitUsageSummary } from "@/lib/tenant-config";
import { db } from "@/lib/db";
import { churchPlanConfig, plans, couponRedemptions, couponCodes, auditLogs, users } from "@/lib/db/schema";
import { eq, asc, desc, inArray } from "drizzle-orm";
import TenantPlanTabs from "./TenantPlanTabs";

type Props = { churchId: string };

function formatLimit(v: number) {
  return v === Infinity ? "∞" : v;
}

function limitStatusColor(status: "unlimited" | "ok" | "approaching" | "at_limit") {
  switch (status) {
    case "unlimited": return "text-success";
    case "ok": return "text-base-content";
    case "approaching": return "text-warning";
    case "at_limit": return "text-error";
    default: return "text-base-content";
  }
}

export default async function TenantPlanSection({ churchId }: Props) {
  const [summaryResult, config, planList, redemptionRows, auditEntries] = await Promise.all([
    getTenantLimitUsageSummary(churchId),
    db.query.churchPlanConfig.findFirst({
      where: eq(churchPlanConfig.churchId, churchId),
      columns: {
        id: true,
        planId: true,
        isManualOverride: true,
        overrideMaxFacilitators: true,
        overrideMaxStudents: true,
        overrideMaxPrograms: true,
        overrideMaxCourses: true,
        overrideMaxStorageMb: true,
        adminNotes: true,
        lastModifiedAt: true,
      },
    }),
    db.query.plans.findMany({
      where: eq(plans.isActive, true),
      orderBy: [asc(plans.sortOrder)],
      columns: { id: true, name: true, slug: true },
    }),
    db.query.couponRedemptions.findMany({
      where: eq(couponRedemptions.churchId, churchId),
    }),
    db.query.auditLogs.findMany({
      where: eq(auditLogs.targetId, churchId),
      orderBy: [desc(auditLogs.createdAt)],
      limit: 20,
      columns: { id: true, action: true, actorId: true, metadata: true, createdAt: true },
    }),
  ]);
  const { limits, usage } = summaryResult;
  const couponIds = [...new Set(redemptionRows.map((r) => r.couponId).filter(Boolean))] as string[];
  const coupons = couponIds.length > 0
    ? await db.query.couponCodes.findMany({
        where: inArray(couponCodes.id, couponIds),
        columns: { id: true, code: true },
      })
    : [];
  const couponById = Object.fromEntries(coupons.map((c) => [c.id, c]));
  const redemptions = redemptionRows.map((r) => ({
    ...r,
    code: (r.couponId && couponById[r.couponId]?.code) ?? "—",
  }));
  const actorIds = [...new Set(auditEntries.map((e) => e.actorId))];
  const actors = actorIds.length > 0
    ? await db.select({ id: users.id, fullName: users.fullName }).from(users).where(inArray(users.id, actorIds))
    : [];
  const actorMap = Object.fromEntries(actors.map((a) => [a.id, a.fullName]));

  return (
    <div className="card bg-white shadow-sm rounded-2xl border border-[#e5e7eb] overflow-hidden">
      <div className="card-body">
        <h2 className="font-heading text-lg font-semibold">Plan & Access</h2>
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <h3 className="font-heading font-semibold text-sm mb-2">Effective limits</h3>
            <div className="badge badge-primary badge-outline mb-2 font-body">
              Source: {limits.sourceDetail ?? limits.source}
            </div>
            {limits.expiresAt && (
              <p className="text-xs text-base-content/60 font-body mb-2">Expires {limits.expiresAt.toLocaleDateString()}</p>
            )}
            <dl className="font-body text-sm space-y-1">
              {(["facilitators", "students", "programs", "courses", "storageMb"] as const).map((key) => {
                const u = usage[key];
                const label = key === "storageMb" ? "Storage" : key.charAt(0).toUpperCase() + key.slice(1);
                const display = key === "storageMb" ? `${formatLimit(u.max)} MB` : `${u.current} / ${formatLimit(u.max)}`;
                return (
                  <div key={key} className="flex justify-between items-center">
                    <dt className="text-base-content/60">{label}</dt>
                    <dd className={`font-medium ${limitStatusColor(u.status)}`}>{display}</dd>
                  </div>
                );
              })}
              <div className="flex justify-between">
                <dt className="text-base-content/60">Integrations</dt>
                <dd>{limits.integrationsMode} — {limits.allowedIntegrations.join(", ") || "none"}</dd>
              </div>
            </dl>
          </div>
        </div>
        <TenantPlanTabs
          churchId={churchId}
          config={config ?? null}
          plans={planList}
          redemptions={redemptions}
        />
        {auditEntries.length > 0 && (
          <div className="mt-8 pt-6 border-t border-base-300">
            <h3 className="font-heading font-semibold text-sm mb-4">Audit log</h3>
            <ul className="timeline timeline-vertical timeline-compact">
              {auditEntries.map((entry, i) => (
                <li key={entry.id}>
                  {i > 0 && <hr className="bg-primary" />}
                  <div className="timeline-start font-body text-sm">
                    <span className="badge badge-ghost badge-sm font-body capitalize">{entry.action.replace(/_/g, " ")}</span>
                    <span className="text-base-content/60 ml-2">{actorMap[entry.actorId] ?? "Unknown"}</span>
                    {entry.metadata && typeof entry.metadata === "object" && Object.keys(entry.metadata).length > 0 && (
                      <span className="text-base-content/50 text-xs block mt-0.5">
                        {JSON.stringify(entry.metadata)}
                      </span>
                    )}
                  </div>
                  <div className="timeline-middle">
                    <div className="w-3 h-3 rounded-full bg-primary" />
                  </div>
                  <hr className="bg-base-300" />
                  <div className="timeline-end font-body text-xs text-base-content/60">
                    {new Date(entry.createdAt).toLocaleString()}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
