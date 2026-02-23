"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createCoupon } from "./actions";

const PLATFORMS = ["zoom", "teams", "google_meet"] as const;

type Plan = { id: string; name: string; slug: string };

type Props = { plans: Plan[] };

function generateCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 4; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return `PROMO-${s}`;
}

function CouponLimitField({ name, label, defaultValue }: { name: string; label: string; defaultValue: number }) {
  const [unlimited, setUnlimited] = useState(false);
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
          placeholder={String(defaultValue)}
                className="input input-bordered rounded-lg font-body placeholder-[#9ca3af] text-[#111827]"
        />
      )}
      {unlimited && <p className="text-xs text-base-content/50 font-body mt-1">∞</p>}
    </div>
  );
}

export default function CouponForm({ plans }: Props) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [grantType, setGrantType] = useState<"plan" | "manual_config">("plan");
  const [durationType, setDurationType] = useState<"permanent" | "days" | "months">("permanent");
  const [durationValue, setDurationValue] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [maxRedemptions, setMaxRedemptions] = useState("");
  const [description, setDescription] = useState("");

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
      <form
        action={async (formData: FormData) => {
          setError(null);
          try {
            await createCoupon(formData);
            router.push("/superadmin/coupons");
            router.refresh();
          } catch (e) {
            setError(e instanceof Error ? e.message : "Something went wrong");
          }
        }}
        className="xl:col-span-2 space-y-6"
      >
        <div className="card bg-white shadow-sm rounded-2xl border border-[#e5e7eb]">
          <div className="card-body gap-6">
            <h2 className="font-heading text-xl font-bold">Basic Info</h2>
            <div className="form-control">
              <label className="label">
                <span className="label-text font-body font-medium">Code</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  name="code"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="e.g. GRACE2026"
                  className="input input-bordered rounded-lg flex-1 font-mono placeholder-[#9ca3af] text-[#111827]"
                  required
                />
                <button
                  type="button"
                  onClick={() => setCode(generateCode())}
                  className="btn btn-outline btn-primary rounded-xl font-body"
                >
                  Generate
                </button>
              </div>
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text font-body font-medium">Description (internal)</span>
              </label>
              <input
                type="text"
                name="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Launch discount"
                className="input input-bordered rounded-lg font-body placeholder-[#9ca3af] text-[#111827]"
              />
            </div>
          </div>
        </div>

        <div className="card bg-white shadow-sm rounded-2xl border border-[#e5e7eb]">
          <div className="card-body gap-6">
            <h2 className="font-heading text-xl font-bold">What it grants</h2>
            <div className="form-control">
              <label className="label">
                <span className="label-text font-body font-medium">Grant type</span>
              </label>
              <div className="flex gap-4">
                <label className="label cursor-pointer gap-2">
                  <input
                    type="radio"
                    name="grantType"
                    value="plan"
                    checked={grantType === "plan"}
                    onChange={() => setGrantType("plan")}
                    className="radio radio-primary"
                  />
                  <span className="label-text font-body">Plan</span>
                </label>
                <label className="label cursor-pointer gap-2">
                  <input
                    type="radio"
                    name="grantType"
                    value="manual_config"
                    checked={grantType === "manual_config"}
                    onChange={() => setGrantType("manual_config")}
                    className="radio radio-primary"
                  />
                  <span className="label-text font-body">Manual config</span>
                </label>
              </div>
            </div>
            {grantType === "plan" && (
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-body font-medium">Plan</span>
                </label>
                <select name="grantPlanId" className="select select-bordered rounded-lg font-body text-[#111827]" required={grantType === "plan"}>
                  <option value="">— Select plan —</option>
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            )}
            {grantType === "manual_config" && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  {(["grantMaxFacilitators", "grantMaxStudents", "grantMaxPrograms", "grantMaxCourses", "grantMaxStorageMb"] as const).map((name) => {
                    const def = name.includes("Storage") ? 500 : 20;
                    const label = name.replace("grantMax", "").replace(/([A-Z])/g, " $1").replace("Mb", " (MB)").trim();
                    return (
                      <CouponLimitField key={name} name={name} label={label} defaultValue={def} />
                    );
                  })}
                </div>
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-body font-medium">Integrations mode</span>
                  </label>
                  <div className="flex gap-4">
                    {(["none", "auto", "manual"] as const).map((mode) => (
                      <label key={mode} className="label cursor-pointer gap-2">
                        <input type="radio" name="grantIntegrationsMode" value={mode} className="radio radio-primary" />
                        <span className="label-text font-body capitalize">{mode}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-body font-medium">Allowed integrations</span>
                  </label>
                  <div className="flex gap-4">
                    {PLATFORMS.map((p) => (
                      <label key={p} className="label cursor-pointer gap-2">
                        <input type="checkbox" name={`grant_allowed_${p}`} className="checkbox checkbox-primary rounded" />
                        <span className="label-text font-body capitalize">{p.replace("_", " ")}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-body font-medium">Feature flags</span>
                  </label>
                  <div className="flex flex-wrap gap-6">
                    <label className="label cursor-pointer gap-2">
                      <input type="checkbox" name="grantCustomBranding" className="checkbox checkbox-primary rounded" />
                      <span className="label-text font-body">Custom branding</span>
                    </label>
                    <label className="label cursor-pointer gap-2">
                      <input type="checkbox" name="grantCertificates" className="checkbox checkbox-primary rounded" />
                      <span className="label-text font-body">Certificates</span>
                    </label>
                    <label className="label cursor-pointer gap-2">
                      <input type="checkbox" name="grantSmsNotifications" className="checkbox checkbox-primary rounded" />
                      <span className="label-text font-body">SMS notifications</span>
                    </label>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="card bg-white shadow-sm rounded-2xl border border-[#e5e7eb]">
          <div className="card-body gap-6">
            <h2 className="font-heading text-xl font-bold">Duration</h2>
            <div className="form-control">
              <label className="label">
                <span className="label-text font-body font-medium">Duration type</span>
              </label>
              <div className="flex gap-4">
                <label className="label cursor-pointer gap-2">
                  <input
                    type="radio"
                    name="durationType"
                    value="permanent"
                    checked={durationType === "permanent"}
                    onChange={() => setDurationType("permanent")}
                    className="radio radio-primary"
                  />
                  <span className="label-text font-body">Permanent</span>
                </label>
                <label className="label cursor-pointer gap-2">
                  <input
                    type="radio"
                    name="durationType"
                    value="days"
                    checked={durationType === "days"}
                    onChange={() => setDurationType("days")}
                    className="radio radio-primary"
                  />
                  <span className="label-text font-body">Days</span>
                </label>
                <label className="label cursor-pointer gap-2">
                  <input
                    type="radio"
                    name="durationType"
                    value="months"
                    checked={durationType === "months"}
                    onChange={() => setDurationType("months")}
                    className="radio radio-primary"
                  />
                  <span className="label-text font-body">Months</span>
                </label>
              </div>
            </div>
            {(durationType === "days" || durationType === "months") && (
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-body font-medium">Duration value</span>
                </label>
                <input
                  type="number"
                  name="durationValue"
                  value={durationValue}
                  onChange={(e) => setDurationValue(e.target.value)}
                  placeholder={durationType === "days" ? "e.g. 30" : "e.g. 6"}
                  className="input input-bordered rounded-lg font-body placeholder-[#9ca3af] text-[#111827]"
                />
              </div>
            )}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-body font-medium">Code expires at (when code can no longer be redeemed)</span>
              </label>
              <input
                type="datetime-local"
                name="expiresAt"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="input input-bordered rounded-lg font-body placeholder-[#9ca3af] text-[#111827]"
              />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text font-body font-medium">Max redemptions</span>
              </label>
              <input
                type="number"
                name="maxRedemptions"
                value={maxRedemptions}
                onChange={(e) => setMaxRedemptions(e.target.value)}
                placeholder="Unlimited if empty"
                className="input input-bordered rounded-lg font-body placeholder-[#9ca3af] text-[#111827]"
              />
            </div>
          </div>
        </div>

        {error && (
          <div className="alert alert-error rounded-2xl">
            <span className="font-body">{error}</span>
          </div>
        )}

        <div className="card-actions justify-end gap-3 pt-4 border-t border-base-300">
          <button type="button" onClick={() => router.back()} className="btn btn-ghost rounded-xl font-body">
            Cancel
          </button>
          <button type="submit" className="btn btn-primary rounded-xl font-body">
            Create Coupon
          </button>
        </div>
      </form>

      <div>
        <div className="card bg-white shadow-sm rounded-2xl border border-[#e5e7eb] sticky top-8">
          <div className="card-body">
            <h3 className="font-heading font-semibold text-base-content">Preview</h3>
            <p className="font-body text-sm text-base-content/60 mt-2">
              {code ? (
                <>
                  <span className="font-mono font-medium">{code}</span>
                  {description && ` — ${description}`}
                </>
              ) : (
                "Enter a code to see preview."
              )}
            </p>
            <div className="mt-4 space-y-2 font-body text-sm">
              <p>
                <span className="text-base-content/60">Grants: </span>
                {grantType === "plan"
                  ? plans.length ? `Selected plan` : "— Select plan —"
                  : "Manual config limits"}
              </p>
              <p>
                <span className="text-base-content/60">Duration: </span>
                {durationType === "permanent"
                  ? "Permanent"
                  : durationType === "days"
                    ? `${durationValue || "?"} days`
                    : `${durationValue || "?"} months`}
              </p>
              <p>
                <span className="text-base-content/60">Usage: </span>
                {maxRedemptions ? `${maxRedemptions} redemptions max` : "Unlimited"}
              </p>
              {expiresAt && (
                <p>
                  <span className="text-base-content/60">Code expires: </span>
                  {new Date(expiresAt).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
