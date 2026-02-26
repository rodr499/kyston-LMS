"use client";

import { useState, useEffect, useRef } from "react";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Tenant = { churchId: string; subdomain: string } | null;

export default function RegisterPage() {
  const [tenant, setTenant] = useState<Tenant>(undefined as Tenant | undefined);
  const [registrationEnabled, setRegistrationEnabled] = useState<boolean | null>(null);
  const registrationFetched = useRef(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Learner form (tenant)
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");

  // Church form (root)
  const [churchName, setChurchName] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminFullName, setAdminFullName] = useState("");

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    let cancelled = false;
    fetch("/api/tenant")
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setTenant(d.tenant ?? null);
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (tenant === undefined) return;
    if (tenant !== null) {
      setRegistrationEnabled(true);
      return;
    }
    if (registrationFetched.current) return;
    registrationFetched.current = true;
    fetch("/api/settings/registration")
      .then((r) => r.json())
      .then((d) => setRegistrationEnabled(d.registrationEnabled !== false))
      .catch(() => setRegistrationEnabled(true));
  }, [tenant]);

  async function handleLearnerSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!tenant) return;
    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
          emailRedirectTo: `${window.location.origin}/auth/callback?church_id=${tenant.churchId}&next=/learn`,
        },
      });
      if (signUpError) {
        setError(signUpError.message);
        setLoading(false);
        return;
      }
      setMessage("Check your email to confirm your account.");
    } catch {
      setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function handleChurchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      const res = await fetch("/api/register-church", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          churchName,
          subdomain: subdomain.toLowerCase().replace(/[^a-z0-9-]/g, ""),
          adminEmail,
          adminPassword,
          adminFullName: adminFullName || adminEmail,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Registration failed.");
        setLoading(false);
        return;
      }
      setMessage("Church created. Check your email to confirm, then sign in.");
    } catch {
      setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  if (tenant === undefined || (tenant === null && registrationEnabled === null)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f8f9fa]">
        <span className="loading loading-spinner loading-lg text-primary" />
      </div>
    );
  }

  if (tenant === null && registrationEnabled === false) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center px-4 py-8 sm:py-12">
        <div className="w-full max-w-md text-center">
          <h1 className="font-heading text-3xl font-bold text-base-content">Registration disabled</h1>
          <p className="font-body text-base-content/70 mt-2">New church registration is currently disabled by the platform administrator.</p>
          <Link href="/" className="btn btn-primary rounded-xl font-body mt-6 inline-block">Back to home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center px-4 py-8 sm:py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-heading text-3xl font-bold text-base-content">
            {tenant ? "Create your account" : "Register your church"}
          </h1>
          <p className="text-base-content/70 font-body mt-1">
            {tenant ? "Join this community as a learner" : "Get your church on Kyston LMS"}
          </p>
        </div>
        <div className="card bg-white shadow-sm rounded-2xl border border-[#e5e7eb]">
          <div className="card-body gap-4">
            {error && (
              <div className="alert alert-error rounded-xl gap-2">
                <span className="font-body">{error}</span>
              </div>
            )}
            {message && (
              <div className="alert alert-success rounded-xl gap-2">
                <span className="font-body">{message}</span>
              </div>
            )}

            {tenant ? (
              <form onSubmit={handleLearnerSubmit} className="flex flex-col gap-4">
                <div className="form-control w-full">
                  <label className="label">
                    <span className="label-text font-body font-medium">Full name</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Your name"
                    className="input input-bordered rounded-lg w-full font-body placeholder-[#9ca3af] text-[#111827]"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>
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
                    required
                    minLength={6}
                  />
                </div>
                <button type="submit" className="btn btn-primary w-full rounded-xl font-body mt-2 min-h-[48px]" disabled={loading}>
                  {loading ? "Creating account…" : "Register"}
                </button>
              </form>
            ) : (
              <form onSubmit={handleChurchSubmit} className="flex flex-col gap-4">
                <div className="form-control w-full">
                  <label className="label">
                    <span className="label-text font-body font-medium">Church name</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Grace Church"
                    className="input input-bordered rounded-lg w-full font-body placeholder-[#9ca3af] text-[#111827]"
                    value={churchName}
                    onChange={(e) => setChurchName(e.target.value)}
                    required
                  />
                </div>
                <div className="form-control w-full">
                  <label className="label">
                    <span className="label-text font-body font-medium">Subdomain</span>
                  </label>
                  <input
                    type="text"
                    placeholder="gracechurch"
                    className="input input-bordered rounded-lg w-full font-body placeholder-[#9ca3af] text-[#111827]"
                    value={subdomain}
                    onChange={(e) => setSubdomain(e.target.value)}
                    required
                  />
                  <label className="label">
                    <span className="label-text-alt text-base-content/60 font-body">
                      Your site: {subdomain || "subdomain"}.kyston.org
                    </span>
                  </label>
                </div>
                <div className="form-control w-full">
                  <label className="label">
                    <span className="label-text font-body font-medium">Your full name</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Admin name"
                    className="input input-bordered rounded-lg w-full font-body placeholder-[#9ca3af] text-[#111827]"
                    value={adminFullName}
                    onChange={(e) => setAdminFullName(e.target.value)}
                  />
                </div>
                <div className="form-control w-full">
                  <label className="label">
                    <span className="label-text font-body font-medium">Admin email</span>
                  </label>
                  <input
                    type="email"
                    placeholder="admin@church.org"
                    className="input input-bordered rounded-lg w-full font-body placeholder-[#9ca3af] text-[#111827]"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
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
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
                <button type="submit" className="btn btn-primary w-full rounded-xl font-body mt-2 min-h-[48px]" disabled={loading}>
                  {loading ? "Creating church…" : "Register church"}
                </button>
              </form>
            )}

            <div className="divider text-sm text-base-content/60 font-body">Already have an account?</div>
            <Link href="/login" className="btn btn-outline btn-primary w-full rounded-xl font-body min-h-[48px]">
              Sign in
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
