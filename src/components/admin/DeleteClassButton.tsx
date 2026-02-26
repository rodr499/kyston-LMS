"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { deleteClassAction } from "@/lib/actions/class-meeting-actions";
import { Trash2 } from "lucide-react";

export default function DeleteClassButton({
  classId,
  churchId,
  programId,
  courseId,
  className = "",
  label = "Delete",
  variant = "ghost",
}: {
  classId: string;
  churchId: string;
  programId: string;
  courseId: string;
  className?: string;
  label?: string;
  variant?: "ghost" | "error";
}) {
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const listPath = `/admin/programs/${programId}/courses/${courseId}/classes`;

  async function handleDelete() {
    setLoading(true);
    setError(null);
    const result = await deleteClassAction({ classId, churchId });
    setLoading(false);
    if (result.success) {
      if (pathname === listPath) {
        router.refresh();
      } else {
        router.push(listPath);
      }
    } else {
      setError(result.error ?? "Failed to delete");
    }
  }

  if (confirming) {
    return (
      <span className="flex items-center gap-2">
        <span className="text-xs font-body text-base-content/80">Delete this class?</span>
        <button
          type="button"
          className="btn btn-ghost btn-xs font-body"
          onClick={() => setConfirming(false)}
          disabled={loading}
        >
          Cancel
        </button>
        <button
          type="button"
          className={`btn btn-xs font-body ${variant === "error" ? "btn-error" : "btn-ghost"}`}
          onClick={handleDelete}
          disabled={loading}
        >
          {loading && <span className="loading loading-spinner loading-xs" />}
          {loading ? "Deleting…" : "Yes, delete"}
        </button>
        {error && <span className="text-error text-xs font-body">{error}</span>}
      </span>
    );
  }

  return (
    <button
      type="button"
      className={`btn btn-ghost btn-xs rounded-lg font-body gap-1 ${variant === "error" ? "text-error hover:text-error" : ""} ${className}`}
      onClick={() => setConfirming(true)}
      title="Delete class"
    >
      <Trash2 className="w-3.5 h-3.5" />
      {label}
    </button>
  );
}
