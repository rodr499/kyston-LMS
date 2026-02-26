"use client";

import { useState } from "react";
import { setRegistrationEnabledAction } from "./actions";

export default function RegistrationToggle({ initialEnabled }: { initialEnabled: boolean }) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleToggle() {
    setError(null);
    setPending(true);
    const next = !enabled;
    const result = await setRegistrationEnabledAction(next);
    setPending(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setEnabled(next);
  }

  return (
    <div className="flex items-center gap-4 mt-2">
      <label className="label cursor-pointer gap-2">
        <input
          type="checkbox"
          className="checkbox checkbox-primary rounded"
          checked={enabled}
          onChange={handleToggle}
          disabled={pending}
        />
        <span className="label-text font-body font-medium">Registration enabled</span>
      </label>
      {pending && <span className="text-sm text-base-content/50">Saving…</span>}
      {error && <span className="text-sm text-error">{error}</span>}
    </div>
  );
}
