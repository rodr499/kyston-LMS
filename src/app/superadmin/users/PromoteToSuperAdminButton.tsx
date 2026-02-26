"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { promoteToSuperAdmin } from "./actions";

export function PromoteToSuperAdminButton({ userId, tenantId }: { userId: string; tenantId?: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleClick() {
    if (!confirm("Make this user a Super Admin? They will keep access to their tenant and gain access to the super admin area.")) return;
    setError(null);
    setLoading(true);
    try {
      const result = await promoteToSuperAdmin(userId, tenantId);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="btn btn-ghost btn-xs rounded-lg font-body text-accent hover:text-accent-focus"
      >
        {loading ? "…" : "Make super admin"}
      </button>
      {error && <span className="text-error text-xs font-body">{error}</span>}
    </div>
  );
}
