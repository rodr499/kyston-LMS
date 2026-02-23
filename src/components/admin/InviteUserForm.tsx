"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function InviteUserForm({ churchId }: { churchId: string }) {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"student" | "facilitator" | "church_admin">("student");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ churchId, email, fullName, role }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Failed");
        setLoading(false);
        return;
      }
      router.push("/admin/users");
      router.refresh();
    } catch {
      setError("Something went wrong");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card bg-white shadow-sm rounded-2xl border border-[#e5e7eb] w-full max-w-2xl">
      <div className="card-body gap-6">
        <h2 className="font-heading text-xl font-bold">Invite user</h2>
        <div className="form-control w-full">
          <label className="label">
            <span className="label-text font-body font-medium text-base-content">Email</span>
          </label>
          <input
            type="email"
            placeholder="colleague@church.org"
            className="input input-bordered rounded-lg w-full font-body placeholder-[#9ca3af] text-[#111827] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="form-control w-full">
          <label className="label">
            <span className="label-text font-body font-medium text-base-content">Full name</span>
          </label>
          <input
            type="text"
            placeholder="Jane Doe"
            className="input input-bordered rounded-lg w-full font-body placeholder-[#9ca3af] text-[#111827] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
        </div>
        <div className="form-control w-full">
          <label className="label">
            <span className="label-text font-body font-medium text-base-content">Role</span>
          </label>
          <select
            className="select select-bordered rounded-lg font-body w-full text-[#111827] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
            value={role}
            onChange={(e) => setRole(e.target.value as "student" | "facilitator" | "church_admin")}
          >
            <option value="student">Student</option>
            <option value="facilitator">Facilitator</option>
            <option value="church_admin">Church Admin</option>
          </select>
        </div>
        {error && <p className="text-error font-body text-sm">{error}</p>}
        <div className="card-actions flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-base-300">
          <button type="button" onClick={() => router.back()} className="btn btn-ghost rounded-xl font-body w-full sm:w-auto min-h-[48px]">
            Cancel
          </button>
          <button type="submit" className="btn btn-primary rounded-xl font-body w-full sm:w-auto min-h-[48px]" disabled={loading}>
            {loading ? "Sending…" : "Send invite"}
          </button>
        </div>
      </div>
    </form>
  );
}
