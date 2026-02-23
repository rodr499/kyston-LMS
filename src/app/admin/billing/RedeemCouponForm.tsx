"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { redeemCoupon } from "./actions";

type Props = { churchId: string };

export default function RedeemCouponForm({ churchId }: Props) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setPending(true);
    try {
      const result = await redeemCoupon(churchId, code.trim());
      setSuccess(result.message);
      setCode("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to redeem code");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-2">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="Enter your code"
          className="input input-bordered rounded-lg flex-1 font-mono placeholder-[#9ca3af] text-[#111827]"
          disabled={pending}
        />
        <button type="submit" disabled={pending || !code.trim()} className="btn btn-primary rounded-xl font-body">
          {pending ? "Applying..." : "Apply Code"}
        </button>
      </form>
      {error && <p className="text-error text-sm font-body">{error}</p>}
      {success && <p className="text-success text-sm font-body">{success}</p>}
    </div>
  );
}
