"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { deleteMyAccountAction } from "@/app/admin/settings/actions";
import { Trash2 } from "lucide-react";

export default function DeleteMyAccount() {
  const [showConfirm, setShowConfirm] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  async function handleDelete() {
    setError(null);
    setPending(true);
    const result = await deleteMyAccountAction();
    setPending(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <div className="card bg-white shadow-sm rounded-2xl border border-[#e5e7eb] border-error/30 max-w-2xl mt-8">
      <div className="card-body gap-4">
        <h2 className="font-heading text-xl font-bold text-error">Delete my account</h2>
        <p className="font-body text-base-content/70">
          Permanently delete your church admin account. You will be signed out and will no longer be able to access this tenant. This does not delete the church or other users.
        </p>
        {error && <p className="text-error text-sm font-body">{error}</p>}
        {!showConfirm ? (
          <button
            type="button"
            onClick={() => setShowConfirm(true)}
            className="btn btn-outline btn-error rounded-xl gap-2 font-body w-fit"
          >
            <Trash2 className="w-4 h-4" /> Delete my account
          </button>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-body text-sm">Are you sure?</span>
            <button type="button" className="btn btn-ghost btn-sm rounded-xl font-body" onClick={() => { setShowConfirm(false); setError(null); }} disabled={pending}>
              Cancel
            </button>
            <button type="button" className="btn btn-error btn-sm rounded-xl font-body" onClick={handleDelete} disabled={pending}>
              {pending ? "Deleting…" : "Yes, delete my account"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
