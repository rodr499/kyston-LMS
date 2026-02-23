"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ProgramForm({
  churchId,
  initial = null,
}: {
  churchId: string;
  initial?: { id: string; name: string; description: string; isPublished: boolean } | null;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [isPublished, setIsPublished] = useState(initial?.isPublished ?? false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/programs", {
        method: initial ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ churchId, name, description, isPublished, ...(initial && { programId: initial.id }) }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Failed");
        setLoading(false);
        return;
      }
      router.push("/admin/programs");
      router.refresh();
    } catch {
      setError("Something went wrong");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card bg-white shadow-sm rounded-2xl border border-[#e5e7eb] max-w-2xl">
      <div className="card-body gap-6">
        <h2 className="font-heading text-xl font-bold">{initial ? "Edit program" : "Create New Program"}</h2>
        <div className="form-control w-full">
          <label className="label">
            <span className="label-text font-body font-medium text-base-content">Program name</span>
          </label>
          <input
            type="text"
            placeholder="e.g. Biblical Studies"
            className="input input-bordered rounded-lg w-full font-body placeholder-[#9ca3af] text-[#111827] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <label className="label">
            <span className="label-text-alt text-base-content/50 font-body">This will be visible to students</span>
          </label>
        </div>
        <div className="form-control w-full">
          <label className="label">
            <span className="label-text font-body font-medium text-base-content">Description</span>
          </label>
          <textarea
            className="textarea textarea-bordered rounded-lg font-body placeholder-[#9ca3af] text-[#111827] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
            placeholder="Brief description of the program"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <label className="label cursor-pointer justify-start gap-2">
          <input
            type="checkbox"
            className="checkbox checkbox-primary rounded"
            checked={isPublished}
            onChange={(e) => setIsPublished(e.target.checked)}
          />
          <span className="label-text font-body">Published (visible on Learning Hub)</span>
        </label>
        {error && <p className="text-error font-body text-sm">{error}</p>}
        <div className="card-actions justify-end gap-3 pt-4 border-t border-base-300">
          <button type="button" onClick={() => router.back()} className="btn btn-ghost rounded-xl font-body">
            Cancel
          </button>
          <button type="submit" className="btn btn-primary rounded-xl font-body" disabled={loading}>
            {loading ? "Saving…" : initial ? "Update" : "Save Program"}
          </button>
        </div>
      </div>
    </form>
  );
}
