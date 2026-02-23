"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) {
        setError(signInError.message);
        setLoading(false);
        return;
      }
      const res = await fetch("/api/me");
      if (!res.ok) {
        setError("Could not load user profile.");
        setLoading(false);
        return;
      }
      const data = await res.json();
      const appDomain = process.env.NEXT_PUBLIC_APP_DOMAIN ?? "kyston.org";
      const isRootDomain =
        typeof window !== "undefined" &&
        (window.location.hostname === "localhost" || window.location.hostname === appDomain);

      if (data.role === "super_admin") {
        setMessage("Taking you to Super Admin…");
        router.push("/superadmin");
      } else if (data.churchId && data.subdomain && isRootDomain) {
        setMessage("Taking you to your dashboard…");
        const port = typeof window !== "undefined" && window.location.port ? `:${window.location.port}` : "";
        const host =
          typeof window !== "undefined" && window.location.hostname === "localhost"
            ? `${data.subdomain}.localhost${port}`
            : `${data.subdomain}.${appDomain}`;
        const proto = typeof window !== "undefined" ? window.location.protocol : "https:";
        const path =
          data.role === "church_admin" ? "/admin" : data.role === "facilitator" ? "/facilitator" : "/learn";
        window.location.href = `${proto}//${host}${path}`;
        return;
      } else if (data.role === "church_admin") {
        setMessage("Taking you to Admin…");
        router.push("/admin");
      } else if (data.role === "facilitator") {
        setMessage("Taking you to Facilitator…");
        router.push("/facilitator");
      } else {
        setMessage("Taking you to Learn…");
        router.push("/learn");
      }
      router.refresh();
    } catch {
      setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    if (!email) {
      setError("Enter your email.");
      return;
    }
    setLoading(true);
    try {
      const { error: magicError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (magicError) {
        setError(magicError.message);
        setLoading(false);
        return;
      }
      setMessage("Check your email for the login link.");
    } catch {
      setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const authError = searchParams?.get("error");

  return (
    <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center px-4 py-8 sm:py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-heading text-3xl font-bold text-base-content">Welcome back</h1>
          <p className="text-base-content/70 font-body mt-1">Sign in to your account</p>
        </div>
        <div className="card bg-white shadow-sm rounded-2xl border border-[#e5e7eb]">
          <div className="card-body gap-4">
            {(error || authError) && (
              <div className="alert alert-error rounded-xl gap-2">
                <span className="font-body">{error || (authError === "auth" ? "Authentication failed." : "Error")}</span>
              </div>
            )}
            {message && (
              <div className="alert alert-success rounded-xl gap-2">
                <span className="font-body">{message}</span>
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
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text font-body font-medium">Password</span>
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  className="input input-bordered rounded-lg w-full font-body placeholder-[#9ca3af] text-[#111827]"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <button type="submit" className="btn btn-primary w-full rounded-xl font-body mt-2 min-h-[48px]" disabled={loading}>
                {loading ? "Signing in…" : "Sign in"}
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm w-full rounded-xl font-body"
                onClick={handleMagicLink}
                disabled={loading}
              >
                Send magic link instead
              </button>
            </form>
            <div className="divider text-sm text-base-content/60 font-body">New here?</div>
            <Link href="/register" className="btn btn-outline btn-primary w-full rounded-xl font-body min-h-[48px]">
              Create an account
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
