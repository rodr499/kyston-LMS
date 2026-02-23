"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function EnrollButton({ classId }: { classId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleClick() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Enrollment failed");
        setLoading(false);
        return;
      }
      router.refresh();
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        className="btn btn-primary btn-sm rounded-xl font-body"
        onClick={handleClick}
        disabled={loading}
      >
        {loading ? "Enrolling…" : "Enroll"}
      </button>
      {error && <p className="text-error font-body text-sm mt-1">{error}</p>}
    </div>
  );
}
