"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createPlan, updatePlan } from "./actions";
import { useFormStatus } from "react-dom";

type PlanRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isPublic: boolean;
  isActive: boolean;
  priceMonthly: string | null;
  priceYearly: string | null;
  stripePriceIdMonthly: string | null;
  stripePriceIdYearly: string | null;
  maxFacilitators: number;
  maxStudents: number;
  maxPrograms: number;
  maxCourses: number;
  maxStorageMb: number;
  integrationsMode: "none" | "auto" | "manual";
  allowedIntegrations: string[] | null;
  customBranding: boolean;
  certificates: boolean;
  smsNotifications: boolean;
  analytics: boolean;
  prioritySupport: boolean;
  sortOrder: number;
};

type Props = { plan?: PlanRow };

const PLATFORMS = ["zoom", "teams", "google_meet"] as const;

function PlanLimitField({
  name,
  label,
  defaultValue,
  defaultUnlimited,
}: {
  name: string;
  label: string;
  defaultValue: number;
  defaultUnlimited: boolean;
}) {
  const [unlimited, setUnlimited] = useState(defaultUnlimited);
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
          defaultValue={defaultValue}
          className="input input-bordered rounded-lg font-body placeholder-[#9ca3af] text-[#111827]"
        />
      )}
      {unlimited && <p className="text-xs text-base-content/50 font-body mt-1">∞</p>}
    </div>
  );
}

function SubmitButton({ plan }: { plan?: PlanRow }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn btn-primary rounded-xl font-body">
      {pending ? "Saving..." : plan ? "Update Plan" : "Create Plan"}
    </button>
  );
}

export default function PlanForm({ plan }: Props) {
  const router = useRouter();
  const [slug, setSlug] = useState(plan?.slug ?? "");
  const [name, setName] = useState(plan?.name ?? "");
  const [error, setError] = useState<string | null>(null);

  const handleNameChange = (v: string) => {
    setName(v);
    if (!plan) setSlug(v.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""));
  };

  async function handleSubmit(formData: FormData) {
    setError(null);
    try {
      if (plan) {
        await updatePlan(plan.id, formData);
      } else {
        await createPlan(formData);
      }
      router.push("/superadmin/plans");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      throw e;
    }
  }

  return (
    <form action={handleSubmit} className="grid grid-cols-1 xl:grid-cols-3 gap-8">
      <div className="xl:col-span-2 space-y-6">
        <div className="card bg-white shadow-sm rounded-2xl border border-[#e5e7eb]">
          <div className="card-body gap-6">
            <h2 className="font-heading text-xl font-bold">Basic Info</h2>
            <div className="form-control w-full">
              <label className="label">
                <span className="label-text font-body font-medium text-base-content">Plan name</span>
              </label>
              <input
                type="text"
                name="name"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g. Pro"
                className="input input-bordered rounded-lg w-full font-body placeholder-[#9ca3af] text-[#111827]"
                required
              />
            </div>
            <div className="form-control w-full">
              <label className="label">
                <span className="label-text font-body font-medium text-base-content">Slug</span>
              </label>
              <input
                type="text"
                name="slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="e.g. pro"
                className="input input-bordered rounded-lg w-full font-body placeholder-[#9ca3af] text-[#111827]"
                required
              />
            </div>
            <div className="form-control w-full">
              <label className="label">
                <span className="label-text font-body font-medium text-base-content">Description</span>
              </label>
              <textarea
                name="description"
                defaultValue={plan?.description ?? ""}
                placeholder="Brief description"
                className="textarea textarea-bordered rounded-lg w-full font-body placeholder-[#9ca3af] text-[#111827]"
                rows={3}
              />
            </div>
            <div className="flex gap-6">
              <label className="label cursor-pointer gap-2">
                <input
                  type="checkbox"
                  name="isPublic"
                  defaultChecked={plan?.isPublic ?? true}
                  className="checkbox checkbox-primary rounded"
                />
                <span className="label-text font-body">Public (visible on pricing page)</span>
              </label>
              <label className="label cursor-pointer gap-2">
                <input
                  type="checkbox"
                  name="isActive"
                  defaultChecked={plan?.isActive ?? true}
                  className="checkbox checkbox-primary rounded"
                />
                <span className="label-text font-body">Active</span>
              </label>
            </div>
            <div className="form-control w-full">
              <label className="label">
                <span className="label-text font-body font-medium text-base-content">Sort order</span>
              </label>
              <input
                type="number"
                name="sortOrder"
                defaultValue={plan?.sortOrder ?? 0}
                className="input input-bordered rounded-lg w-full font-body placeholder-[#9ca3af] text-[#111827]"
              />
            </div>
          </div>
        </div>

        <div className="card bg-white shadow-sm rounded-2xl border border-[#e5e7eb]">
          <div className="card-body gap-6">
            <h2 className="font-heading text-xl font-bold">Pricing</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-body font-medium">Monthly price</span>
                </label>
                <input
                  type="number"
                  name="priceMonthly"
                  step="0.01"
                  defaultValue={plan?.priceMonthly ?? ""}
                  placeholder="0 = Free"
                  className="input input-bordered rounded-lg font-body placeholder-[#9ca3af] text-[#111827]"
                />
              </div>
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-body font-medium">Yearly price</span>
                </label>
                <input
                  type="number"
                  name="priceYearly"
                  step="0.01"
                  defaultValue={plan?.priceYearly ?? ""}
                  placeholder="0 = Free"
                  className="input input-bordered rounded-lg font-body placeholder-[#9ca3af] text-[#111827]"
                />
              </div>
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text font-body font-medium">Stripe Price ID (monthly)</span>
              </label>
              <input
                type="text"
                name="stripePriceIdMonthly"
                defaultValue={plan?.stripePriceIdMonthly ?? ""}
                className="input input-bordered rounded-lg font-body placeholder-[#9ca3af] text-[#111827]"
              />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text font-body font-medium">Stripe Price ID (yearly)</span>
              </label>
              <input
                type="text"
                name="stripePriceIdYearly"
                defaultValue={plan?.stripePriceIdYearly ?? ""}
                className="input input-bordered rounded-lg font-body placeholder-[#9ca3af] text-[#111827]"
              />
            </div>
          </div>
        </div>

        <div className="card bg-white shadow-sm rounded-2xl border border-[#e5e7eb]">
          <div className="card-body gap-6">
            <h2 className="font-heading text-xl font-bold">Resource Limits</h2>
            <div className="grid grid-cols-2 gap-4">
              {(["maxFacilitators", "maxStudents", "maxPrograms", "maxCourses", "maxStorageMb"] as const).map(
                (key) => {
                  const def = key === "maxFacilitators" ? 3 : key === "maxStudents" ? 20 : key === "maxPrograms" ? 2 : key === "maxCourses" ? 5 : 500;
                  const val = plan?.[key];
                  const isUnlimited = val === -1;
                  const numVal = typeof val === "number" && val !== -1 ? val : def;
                  const label = key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase());
                  return (
                    <PlanLimitField
                      key={key}
                      name={key}
                      label={label}
                      defaultValue={numVal}
                      defaultUnlimited={isUnlimited}
                    />
                  );
                }
              )}
            </div>
          </div>
        </div>

        <div className="card bg-white shadow-sm rounded-2xl border border-[#e5e7eb]">
          <div className="card-body gap-6">
            <h2 className="font-heading text-xl font-bold">Integrations</h2>
            <div className="form-control">
              <label className="label">
                <span className="label-text font-body font-medium">Mode</span>
              </label>
              <div className="flex gap-4">
                {(["none", "auto", "manual"] as const).map((mode) => (
                  <label key={mode} className="label cursor-pointer gap-2">
                    <input
                      type="radio"
                      name="integrationsMode"
                      value={mode}
                      defaultChecked={(plan?.integrationsMode ?? "none") === mode}
                      className="radio radio-primary"
                    />
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
                    <input
                      type="checkbox"
                      name={`allowed_${p}`}
                      defaultChecked={plan?.allowedIntegrations?.includes(p) ?? false}
                      className="checkbox checkbox-primary rounded"
                    />
                    <span className="label-text font-body capitalize">{p.replace("_", " ")}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="card bg-white shadow-sm rounded-2xl border border-[#e5e7eb]">
          <div className="card-body gap-6">
            <h2 className="font-heading text-xl font-bold">Feature Flags</h2>
            <div className="flex flex-wrap gap-6">
              {(["customBranding", "certificates", "smsNotifications", "analytics", "prioritySupport"] as const).map(
                (key) => (
                  <label key={key} className="label cursor-pointer gap-2">
                    <input
                      type="checkbox"
                      name={key}
                      defaultChecked={plan?.[key] ?? false}
                      className="checkbox checkbox-primary rounded"
                    />
                    <span className="label-text font-body">
                      {key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase())}
                    </span>
                  </label>
                )
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className="alert alert-error rounded-2xl">
            <span className="font-body">{error}</span>
          </div>
        )}

        <div className="card-actions justify-end gap-3">
          <button type="button" onClick={() => router.back()} className="btn btn-ghost rounded-xl font-body">
            Cancel
          </button>
          <SubmitButton plan={plan} />
        </div>
      </div>

      <div>
        <div className="card bg-white shadow-sm rounded-2xl border border-[#e5e7eb] sticky top-8">
          <div className="card-body">
            <h3 className="font-heading font-semibold text-base-content">Preview</h3>
            <p className="font-body text-sm text-base-content/60">
              Preview will update as you fill the form.
            </p>
            <div className="stat bg-[#f1f3f5] rounded-xl p-4 mt-4">
              <div className="stat-title text-base-content/60 font-body text-xs">{name || "Plan name"}</div>
              <div className="stat-value font-heading text-2xl">
                {plan?.priceMonthly ? `$${plan.priceMonthly}/mo` : "Free"}
              </div>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
