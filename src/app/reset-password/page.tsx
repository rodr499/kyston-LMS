"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PoweredByKyston from "@/components/tenant/PoweredByKyston";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.replace("/login?error=session");
      } else {
        setReady(true);
      }
    });
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(updateError.message);
        setLoading(false);
        return;
      }
      await supabase.auth.signOut();
      router.push("/login?message=Password updated. Please sign in with your new password.");
    } catch {
      setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  if (!ready) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center px-4">
        <div className="loading loading-spinner loading-lg text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center px-4 py-8 sm:py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-heading text-3xl font-bold text-base-content">Set new password</h1>
          <p className="font-body text-base-content/70 mt-1">Enter your new password below</p>
        </div>
        <div className="card bg-white shadow-sm rounded-2xl border border-[#e5e7eb]">
          <div className="card-body gap-4">
            {error && (
              <div className="alert alert-error rounded-xl gap-2">
                <span className="font-body">{error}</span>
              </div>
            )}
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text font-body font-medium">New password</span>
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  className="input input-bordered rounded-lg w-full font-body placeholder-[#9ca3af] text-[#111827]"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="new-password"
                />
              </div>
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text font-body font-medium">Confirm password</span>
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  className="input input-bordered rounded-lg w-full font-body placeholder-[#9ca3af] text-[#111827]"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="new-password"
                />
              </div>
              <button
                type="submit"
                className="btn btn-primary w-full rounded-xl font-body min-h-[48px]"
                disabled={loading}
              >
                {loading ? "Updating…" : "Update password"}
              </button>
            </form>
            <Link href="/login" className="btn btn-ghost btn-sm w-full rounded-xl font-body">
              Back to sign in
            </Link>
          </div>
        </div>
        <p className="text-center mt-6 font-body">
          <Link href="/" className="link link-primary text-sm">Back to home</Link>
        </p>
        <PoweredByKyston />
      </div>
    </div>
  );
}
