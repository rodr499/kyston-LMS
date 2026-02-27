"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const redirectTo = `${typeof window !== "undefined" ? window.location.origin : ""}/auth/callback?next=/reset-password`;
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      });
      if (resetError) {
        setError(resetError.message);
        setLoading(false);
        return;
      }
      setSent(true);
    } catch {
      setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center px-4 py-8 sm:py-12">
        <div className="w-full max-w-md">
          <div className="card bg-white shadow-sm rounded-2xl border border-[#e5e7eb]">
            <div className="card-body gap-4">
              <h1 className="font-heading text-2xl font-bold text-base-content">Check your email</h1>
              <p className="font-body text-base-content/70">
                If an account exists for <strong>{email}</strong>, you will receive a password reset link shortly.
              </p>
              <div className="alert alert-info rounded-xl gap-2">
                <span className="font-body text-sm">
                  The link may take a few minutes to arrive. Check your spam folder if you don&apos;t see it.
                </span>
              </div>
              <Link href="/login" className="btn btn-primary w-full rounded-xl font-body min-h-[48px]">
                Back to sign in
              </Link>
            </div>
          </div>
          <p className="text-center mt-6 font-body">
            <Link href="/" className="link link-primary text-sm">Back to home</Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center px-4 py-8 sm:py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-heading text-3xl font-bold text-base-content">Forgot password</h1>
          <p className="font-body text-base-content/70 mt-1">Enter your email to receive a reset link</p>
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
                  <span className="label-text font-body font-medium">Email</span>
                </label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  className="input input-bordered rounded-lg w-full font-body placeholder-[#9ca3af] text-[#111827]"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <button
                type="submit"
                className="btn btn-primary w-full rounded-xl font-body min-h-[48px]"
                disabled={loading}
              >
                {loading ? "Sending…" : "Send reset link"}
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
      </div>
    </div>
  );
}
