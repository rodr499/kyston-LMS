"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setTenantActiveAction, deleteTenantAction } from "../actions";
import { Pause, Play, Trash2 } from "lucide-react";

export default function TenantActions({ churchId, churchName, isActive }: { churchId: string; churchName: string; isActive: boolean }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const router = useRouter();

  async function handleSetActive(active: boolean) {
    setError(null);
    setPending(true);
    const result = await setTenantActiveAction(churchId, active);
    setPending(false);
    if (result.error) setError(result.error);
    else router.refresh();
  }

  async function handleDelete() {
    setError(null);
    setPending(true);
    const result = await deleteTenantAction(churchId);
    setPending(false);
    setShowDeleteConfirm(false);
    if (result.error) setError(result.error);
    else router.push("/superadmin/tenants");
  }

  return (
    <div className="card bg-white shadow-sm rounded-2xl border border-[#e5e7eb]">
      <div className="card-body">
        <h2 className="font-heading text-lg font-semibold">Tenant actions</h2>
        <p className="font-body text-sm text-base-content/70">Suspend blocks access to the tenant site. Delete removes the tenant and all data permanently.</p>
        {error && <p className="text-error text-sm font-body">{error}</p>}
        <div className="flex flex-wrap gap-3 mt-2">
          {isActive ? (
            <button
              type="button"
              onClick={() => handleSetActive(false)}
              disabled={pending}
              className="btn btn-outline btn-warning btn-sm rounded-xl gap-2 font-body"
            >
              <Pause className="w-4 h-4" /> Suspend tenant
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleSetActive(true)}
              disabled={pending}
              className="btn btn-outline btn-success btn-sm rounded-xl gap-2 font-body"
            >
              <Play className="w-4 h-4" /> Activate tenant
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            disabled={pending}
            className="btn btn-outline btn-error btn-sm rounded-xl gap-2 font-body"
          >
            <Trash2 className="w-4 h-4" /> Delete tenant
          </button>
        </div>
      </div>
      {showDeleteConfirm && (
        <div className="modal modal-open">
          <div className="modal-box rounded-2xl">
            <h3 className="font-heading text-lg font-bold">Delete tenant?</h3>
            <p className="font-body text-base-content/70 py-2">
              This will permanently delete <strong>{churchName}</strong> and all its users, programs, and data. This cannot be undone.
            </p>
            <div className="modal-action">
              <button type="button" className="btn btn-ghost rounded-xl font-body" onClick={() => setShowDeleteConfirm(false)} disabled={pending}>
                Cancel
              </button>
              <button type="button" className="btn btn-error rounded-xl font-body" onClick={handleDelete} disabled={pending}>
                {pending ? "Deleting…" : "Delete permanently"}
              </button>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop" onClick={() => setShowDeleteConfirm(false)}>
            <button type="button">close</button>
          </form>
        </div>
      )}
    </div>
  );
}
