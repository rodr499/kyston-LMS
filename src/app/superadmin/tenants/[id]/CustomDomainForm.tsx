"use client";

import { useState } from "react";
import { saveCustomDomainAction } from "./actions";

type Props = {
  churchId: string;
  initialDomain: string | null;
  initialRecordType: "CNAME" | "A" | null;
  cnameValue: string;
  aValue: string;
};

export default function CustomDomainForm({
  churchId,
  initialDomain,
  initialRecordType,
  cnameValue,
  aValue,
}: Props) {
  const [domain, setDomain] = useState(initialDomain ?? "");
  const [recordType, setRecordType] = useState<"CNAME" | "A">(
    (initialRecordType as "CNAME" | "A") || "CNAME"
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const recordValue = recordType === "A" ? aValue : cnameValue;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const formData = new FormData();
    formData.set("customDomain", domain.trim());
    formData.set("customDomainRecordType", recordType);
    const result = await saveCustomDomainAction(churchId, formData);
    setPending(false);
    if (result.error) {
      setError(result.error);
      return;
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="form-control">
        <label className="label">
          <span className="label-text font-body font-medium">Custom domain</span>
        </label>
        <input
          type="text"
          placeholder="ruta.acmk.us"
          className="input input-bordered rounded-lg w-full font-body"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
        />
        <p className="label-text-alt text-base-content/60 mt-1">
          The tenant&apos;s own domain. Leave empty to use subdomain only.
        </p>
      </div>
      {domain.trim() && (
        <div className="form-control">
          <label className="label">
            <span className="label-text font-body font-medium">Required DNS record type</span>
          </label>
          <select
            name="customDomainRecordType"
            className="select select-bordered rounded-lg font-body"
            value={recordType}
            onChange={(e) => setRecordType(e.target.value as "CNAME" | "A")}
          >
            <option value="CNAME">CNAME</option>
            <option value="A">A</option>
          </select>
          <div className="alert alert-info rounded-xl mt-2">
            <p className="font-body text-sm">
              Tenant must add this DNS record at their registrar:
            </p>
            <p className="font-mono text-sm mt-1">
              <strong>{recordType}</strong> → <strong>{recordValue}</strong>
            </p>
          </div>
        </div>
      )}
      {error && <p className="text-error text-sm font-body">{error}</p>}
      <button
        type="submit"
        className="btn btn-primary btn-sm rounded-xl font-body"
        disabled={pending}
      >
        {pending ? "Saving…" : "Save"}
      </button>
    </form>
  );
}
