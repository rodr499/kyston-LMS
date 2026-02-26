"use client";

import { useState } from "react";
import { applyPlan, saveManualOverride } from "./actions";

function LimitFieldWithUnlimited({
  name,
  label,
  defaultValue,
  defaultUnlimited,
}: {
  name: string;
  label: string;
  defaultValue?: number | null;
  defaultUnlimited: boolean;
}) {
  const [unlimited, setUnlimited] = useState(defaultUnlimited);
  const safeDefault = defaultValue != null && Number.isFinite(defaultValue) ? defaultValue : 0;
  return (
    <div className="form-control">
      <label className="label">
        <span className="label-text font-body font-medium">{label}</span>
        <label className="label cursor-pointer gap-2">
          <input
            type="checkbox"
            checked={unlimited}
            onChange={(e) => setUnlimited(e.target.checked)}
            className="checkbox checkbox-primary checkbox-sm rounded"
          />
          <span className="label-text font-body text-xs">Unlimited</span>
        </label>
      </label>
      {unlimited ? (
        <input type="hidden" name={name} value="-1" />
      ) : (
        <input
          type="number"
          name={name}
          defaultValue={safeDefault}
          className="input input-bordered rounded-lg font-body placeholder-[#9ca3af] text-[#111827]"
        />
      )}
      {unlimited && (
        <p className="text-xs text-base-content/50 font-body mt-1">∞</p>
      )}
    </div>
  );
}

type Plan = { id: string; name: string; slug: string };
type Config = {
  id: string;
  planId: string | null;
  isManualOverride: boolean;
  overrideMaxFacilitators?: number | null;
  overrideMaxStudents?: number | null;
  overrideMaxPrograms?: number | null;
  overrideMaxCourses?: number | null;
  overrideMaxStorageMb?: number | null;
  adminNotes: string | null;
  lastModifiedAt: Date | null;
} | null;
type Redemption = {
  id: string;
  couponId: string | null;
  redeemedAt: Date | null;
  expiresAt: Date | null;
  isActive: boolean;
  code: string;
};

type Props = {
  churchId: string;
  config: Config;
  plans: Plan[];
  redemptions: Redemption[];
};

export default function TenantPlanTabs({ churchId, config, plans, redemptions }: Props) {
  const [tab, setTab] = useState<"plan" | "override" | "coupons">("plan");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="mt-6">
      <div role="tablist" className="tabs tabs-boxed bg-base-200 rounded-xl p-1">
        <button
          role="tab"
          className={`tab rounded-lg font-body ${tab === "plan" ? "tab-active" : ""}`}
          onClick={() => setTab("plan")}
        >
          Assign Plan
        </button>
        <button
          role="tab"
          className={`tab rounded-lg font-body ${tab === "override" ? "tab-active" : ""}`}
          onClick={() => setTab("override")}
        >
          Manual Override
        </button>
        <button
          role="tab"
          className={`tab rounded-lg font-body ${tab === "coupons" ? "tab-active" : ""}`}
          onClick={() => setTab("coupons")}
        >
          Coupon Codes
        </button>
      </div>

      <div className="mt-6">
        {tab === "plan" && (
          <form
            action={async (formData: FormData) => {
              setError(null);
              setPending(true);
              try {
                await applyPlan(churchId, formData);
              } catch (e) {
                setError(e instanceof Error ? e.message : "Failed");
              } finally {
                setPending(false);
              }
            }}
            className="space-y-4"
          >
            <div className="form-control">
              <label className="label">
                <span className="label-text font-body font-medium">Select plan</span>
              </label>
              <select name="planId" className="select select-bordered rounded-lg font-body text-[#111827]" defaultValue={config?.planId ?? ""}>
                <option value="">— None (use church default) —</option>
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            {error && <p className="text-error text-sm font-body">{error}</p>}
            <button type="submit" disabled={pending} className="btn btn-primary rounded-xl font-body">
              {pending ? "Applying..." : "Apply Plan"}
            </button>
          </form>
        )}

        {tab === "override" && (
          <div className="space-y-4">
            {config?.isManualOverride && (
              <div className="alert alert-warning rounded-2xl">
                <span className="font-body">Manual override is active — this tenant&apos;s plan limits are being ignored.</span>
              </div>
            )}
            <form
              action={async (formData: FormData) => {
                setError(null);
                setPending(true);
                try {
                  await saveManualOverride(churchId, formData);
                } catch (e) {
                  setError(e instanceof Error ? e.message : "Failed");
                } finally {
                  setPending(false);
                }
              }}
              className="space-y-4"
            >
              <label className="label cursor-pointer gap-2">
                <input
                  type="checkbox"
                  name="isManualOverride"
                  defaultChecked={config?.isManualOverride ?? false}
                  className="checkbox checkbox-primary rounded"
                />
                <span className="label-text font-body font-medium">Enable Manual Override</span>
              </label>
              <div className="grid grid-cols-2 gap-4">
                {(["overrideMaxFacilitators", "overrideMaxStudents", "overrideMaxPrograms", "overrideMaxCourses", "overrideMaxStorageMb"] as const).map((name) => {
                  const val = config?.[name];
                  const def = name.includes("Storage") ? 500 : 3;
                  const isUnlimited = val === -1 || (val == null && !!config?.isManualOverride);
                  const numVal = typeof val === "number" && val !== -1 ? val : def;
                  const label = name.replace("overrideMax", "").replace(/([A-Z])/g, " $1").replace("Mb", " (MB)").trim();
                  return (
                    <LimitFieldWithUnlimited
                      key={name}
                      name={name}
                      label={label}
                      defaultValue={numVal}
                      defaultUnlimited={isUnlimited}
                    />
                  );
                })}
              </div>
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-body font-medium">Admin notes (internal)</span>
                </label>
                <textarea
                  name="adminNotes"
                  defaultValue={config?.adminNotes ?? ""}
                  className="textarea textarea-bordered rounded-lg font-body placeholder-[#9ca3af] text-[#111827]"
                  rows={3}
                />
              </div>
              {error && <p className="text-error text-sm font-body">{error}</p>}
              <button type="submit" disabled={pending} className="btn btn-primary rounded-xl font-body">
                {pending ? "Saving..." : "Save Override"}
              </button>
            </form>
          </div>
        )}

        {tab === "coupons" && (
          <div className="space-y-4">
            <h4 className="font-heading font-semibold text-sm">Redeemed coupons</h4>
            {redemptions.length === 0 ? (
              <p className="font-body text-base-content/60 text-sm">No coupon redemptions for this tenant.</p>
            ) : (
              <ul className="font-body text-sm space-y-2">
                {redemptions.map((r) => (
                  <li key={r.id} className="flex items-center justify-between">
                    <span className="font-mono">{r.code}</span>
                    <span className="text-base-content/60">
                      {r.redeemedAt && new Date(r.redeemedAt).toLocaleDateString()}
                      {r.expiresAt && ` → ${new Date(r.expiresAt).toLocaleDateString()}`}
                    </span>
                    {r.isActive ? (
                      <span className="badge badge-success badge-sm">Active</span>
                    ) : (
                      <span className="badge badge-ghost badge-sm">Revoked</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
