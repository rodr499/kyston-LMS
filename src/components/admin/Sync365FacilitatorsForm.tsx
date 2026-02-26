"use client";

import { useState } from "react";
import { Users, Loader2, Plus, Trash2 } from "lucide-react";

export type GroupRoleMapping = { groupId: string; role: "church_admin" | "facilitator" | "student" };

const ROLES: { value: GroupRoleMapping["role"]; label: string }[] = [
  { value: "church_admin", label: "Church admin" },
  { value: "facilitator", label: "Facilitator" },
  { value: "student", label: "Student" },
];

type Props = {
  initialGroupRoleMappings: GroupRoleMapping[];
};

export default function Sync365FacilitatorsForm({ initialGroupRoleMappings }: Props) {
  const [mappings, setMappings] = useState<GroupRoleMapping[]>(
    initialGroupRoleMappings.length > 0
      ? initialGroupRoleMappings
      : [{ groupId: "", role: "facilitator" }]
  );
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isPending, setIsPending] = useState(false);

  function addRow() {
    setMappings((prev) => [...prev, { groupId: "", role: "facilitator" }]);
  }

  function removeRow(i: number) {
    setMappings((prev) => prev.filter((_, idx) => idx !== i));
  }

  function updateRow(i: number, field: "groupId" | "role", value: string) {
    setMappings((prev) =>
      prev.map((row, idx) =>
        idx === i ? { ...row, [field]: value as GroupRoleMapping["role"] } : row
      )
    );
  }

  async function handleSave() {
    setMessage(null);
    const valid = mappings
      .map((m) => ({ groupId: m.groupId.trim(), role: m.role }))
      .filter((m) => m.groupId.length > 0);
    if (valid.length === 0) {
      setMessage({ type: "error", text: "Add at least one AD group ID and choose an LMS role." });
      return;
    }
    setIsPending(true);
    try {
      const res = await fetch("/api/admin/sync-365-facilitators", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupRoleMappings: valid }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: data.error ?? "Failed" });
        return;
      }
      const parts = [];
      if (data.synced != null) {
        parts.push(`Synced ${data.synced} member(s): ${data.created} added, ${data.updated} role(s) updated.`);
        if (data.skippedSuperAdmin > 0) {
          parts.push(` ${data.skippedSuperAdmin} super admin(s) left unchanged.`);
        }
      } else {
        parts.push("Mappings saved.");
      }
      setMessage({ type: "success", text: parts.join("") });
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="card bg-white shadow-sm rounded-2xl border border-[#e5e7eb]">
      <div className="card-body p-6 gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center">
            <Users className="w-5 h-5 text-secondary" />
          </div>
          <div>
            <h3 className="font-heading font-semibold text-base-content">Map AD groups to LMS roles</h3>
            <p className="text-base-content/60 text-sm font-body">
              Map each Microsoft 365 / Azure AD group to an LMS role (Church admin, Facilitator, or Student). Members are synced with the chosen role; if a user is in multiple groups, the highest role wins. Super admins are never changed.
            </p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="table table-sm">
            <thead>
              <tr className="border-b border-base-300">
                <th className="font-body font-medium text-base-content/80">AD group ID (Object ID)</th>
                <th className="font-body font-medium text-base-content/80">LMS role</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {mappings.map((row, i) => (
                <tr key={i} className="border-b border-base-200/60">
                  <td className="p-0 py-2">
                    <input
                      type="text"
                      placeholder="e.g. 01234567-89ab-cdef-0123-456789abcdef"
                      className="input input-bordered input-sm rounded-lg font-body w-full max-w-md"
                      value={row.groupId}
                      onChange={(e) => updateRow(i, "groupId", e.target.value)}
                      disabled={isPending}
                    />
                  </td>
                  <td className="p-0 py-2">
                    <select
                      className="select select-bordered select-sm rounded-lg font-body"
                      value={row.role}
                      onChange={(e) => updateRow(i, "role", e.target.value)}
                      disabled={isPending}
                    >
                      {ROLES.map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="p-0 py-2 align-middle">
                    <button
                      type="button"
                      onClick={() => removeRow(i)}
                      disabled={isPending || mappings.length <= 1}
                      className="btn btn-ghost btn-xs btn-square text-error"
                      aria-label="Remove row"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button
          type="button"
          onClick={addRow}
          disabled={isPending}
          className="btn btn-ghost btn-sm rounded-lg font-body gap-1 w-fit"
        >
          <Plus className="w-4 h-4" />
          Add mapping
        </button>
        <p className="text-xs text-base-content/50 font-body">
          Group Object IDs: Azure Portal → Groups → your group → Object ID. App needs Group.Read.All; reconnect Teams if sync fails.
        </p>
        {message && (
          <div
            className={`alert rounded-xl ${message.type === "error" ? "alert-error" : "alert-success"}`}
            role="alert"
          >
            <span className="font-body text-sm">{message.text}</span>
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            className="btn btn-primary rounded-xl font-body gap-2"
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Syncing…
              </>
            ) : (
              "Save & sync now"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
