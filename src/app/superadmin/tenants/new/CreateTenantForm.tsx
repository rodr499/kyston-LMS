"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createTenantAction } from "../actions";

export default function CreateTenantForm() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const formData = new FormData(e.currentTarget);
    const result = await createTenantAction(formData);
    setPending(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    if (result.churchId) {
      router.push(`/superadmin/tenants/${result.churchId}`);
      router.refresh();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card bg-white shadow-sm rounded-2xl border border-[#e5e7eb] max-w-xl">
      <div className="card-body gap-4">
        <div className="form-control">
          <label className="label"><span className="label-text font-body font-medium">Church name</span></label>
          <input type="text" name="churchName" placeholder="Grace Church" className="input input-bordered rounded-lg font-body" required />
        </div>
        <div className="form-control">
          <label className="label"><span className="label-text font-body font-medium">Subdomain</span></label>
          <input type="text" name="subdomain" placeholder="gracechurch" className="input input-bordered rounded-lg font-body" required />
          <p className="text-xs text-base-content/50 mt-1">Letters, numbers, and hyphens only. Will be used as {typeof window !== "undefined" ? window.location.hostname?.replace(/^[^.]+\./, "") ?? "subdomain.domain" : "subdomain.domain"}.</p>
        </div>
        <div className="form-control">
          <label className="label"><span className="label-text font-body font-medium">Admin email</span></label>
          <input type="email" name="adminEmail" placeholder="admin@church.org" className="input input-bordered rounded-lg font-body" required />
        </div>
        <div className="form-control">
          <label className="label"><span className="label-text font-body font-medium">Admin full name</span></label>
          <input type="text" name="adminFullName" placeholder="Jane Admin" className="input input-bordered rounded-lg font-body" />
        </div>
        <div className="form-control">
          <label className="label"><span className="label-text font-body font-medium">Admin password</span></label>
          <input type="password" name="adminPassword" placeholder="••••••••" className="input input-bordered rounded-lg font-body" required minLength={6} />
        </div>
        {error && <p className="text-error text-sm font-body">{error}</p>}
        <div className="card-actions justify-end pt-2">
          <button type="submit" className="btn btn-primary rounded-xl font-body" disabled={pending}>
            {pending ? "Creating…" : "Create tenant"}
          </button>
        </div>
      </div>
    </form>
  );
}
