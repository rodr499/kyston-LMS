"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { removeClassMeetingAction } from "@/lib/actions/class-meeting-actions";

export default function RemoveMeetingButton({
  classId,
  churchId,
  disabled,
}: {
  classId: string;
  churchId: string;
  disabled?: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const router = useRouter();

  async function handleRemove() {
    setLoading(true);
    setError(null);
    const result = await removeClassMeetingAction({ classId, churchId });
    setLoading(false);
    setConfirming(false);
    if (result.success) {
      router.refresh();
    } else {
      setError(result.error ?? "Failed to remove meeting");
    }
  }

  if (confirming) {
    return (
      <span className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-body text-base-content/80">Remove meeting link and delete it in Teams?</span>
        <button
          type="button"
          className="btn btn-ghost btn-sm font-body"
          onClick={() => { setConfirming(false); setError(null); }}
          disabled={loading}
        >
          Cancel
        </button>
        <button
          type="button"
          className="btn btn-error btn-sm font-body"
          onClick={handleRemove}
          disabled={loading}
        >
          {loading ? "Removing…" : "Yes, remove"}
        </button>
        {error && <span className="text-error text-sm font-body">{error}</span>}
      </span>
    );
  }

  return (
    <button
      type="button"
      className="btn btn-ghost btn-sm font-body text-error hover:text-error"
      onClick={() => setConfirming(true)}
      disabled={disabled}
    >
      Remove meeting
    </button>
  );
}
