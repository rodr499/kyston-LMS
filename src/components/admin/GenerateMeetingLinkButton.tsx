"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { generateClassMeetingLinkAction, updateClassMeetingLinkAction } from "@/lib/actions/class-meeting-actions";
import { Link2, RefreshCw } from "lucide-react";

export default function GenerateMeetingLinkButton({
  classId,
  churchId,
  disabled,
  hasExistingMeeting,
}: {
  classId: string;
  churchId: string;
  disabled?: boolean;
  /** When true, show "Update meeting" and update the existing Teams meeting instead of creating. */
  hasExistingMeeting?: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleClick() {
    setLoading(true);
    setError(null);
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const result = hasExistingMeeting
      ? await updateClassMeetingLinkAction({ classId, churchId, timezone })
      : await generateClassMeetingLinkAction({ classId, churchId, timezone });
    setLoading(false);
    if (result.success) {
      router.refresh();
    } else {
      setError(result.error ?? (hasExistingMeeting ? "Failed to update meeting" : "Failed to generate link"));
    }
  }

  const isUpdate = !!hasExistingMeeting;
  const label = isUpdate ? "Update meeting" : "Generate meeting link";
  const loadingLabel = isUpdate ? "Updating…" : "Generating…";

  return (
    <span className="flex items-center gap-2">
      <button
        type="button"
        className="btn btn-primary btn-sm rounded-lg font-body gap-2"
        onClick={handleClick}
        disabled={disabled || loading}
      >
        {isUpdate ? <RefreshCw className="w-4 h-4" /> : <Link2 className="w-4 h-4" />}
        {loading ? loadingLabel : label}
      </button>
      {error && <span className="text-error text-sm font-body">{error}</span>}
    </span>
  );
}
