"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SettingsForm({
  churchId,
  initial,
}: {
  churchId: string;
  initial: { name: string; primaryColor: string; subdomain: string; logoUrl: string | null };
}) {
  const [name, setName] = useState(initial.name);
  const [primaryColor, setPrimaryColor] = useState(initial.primaryColor);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ churchId, name, primaryColor }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Failed");
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
    <form onSubmit={handleSubmit} className="card bg-white shadow-sm rounded-2xl border border-[#e5e7eb] max-w-2xl">
      <div className="card-body gap-6">
        <h2 className="font-heading text-xl font-bold">Church profile</h2>
        <div className="form-control w-full">
          <label className="label">
            <span className="label-text font-body font-medium text-base-content">Church name</span>
          </label>
          <input
            type="text"
            placeholder="e.g. Grace Church"
            className="input input-bordered rounded-lg w-full font-body placeholder-[#9ca3af] text-[#111827] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div className="form-control w-full">
          <label className="label">
            <span className="label-text font-body font-medium text-base-content">Primary color</span>
          </label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              className="h-10 w-14 rounded-lg cursor-pointer border border-[#e5e7eb] transition-all duration-200"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
            />
            <span className="font-body text-sm text-base-content/70">{primaryColor}</span>
          </div>
        </div>
        <p className="font-body text-sm text-base-content/50">Subdomain: {initial.subdomain} (read-only)</p>
        {error && <p className="text-error font-body text-sm">{error}</p>}
        <div className="card-actions justify-end gap-3 pt-4 border-t border-base-300">
          <button type="button" onClick={() => router.back()} className="btn btn-ghost rounded-xl font-body">
            Cancel
          </button>
          <button type="submit" className="btn btn-primary rounded-xl font-body" disabled={loading}>
            {loading ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </form>
  );
}
