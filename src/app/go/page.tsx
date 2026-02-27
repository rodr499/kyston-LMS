"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const RESERVED_SUBDOMAINS = ["www", "superadmin", "api", "app", "admin", "auth"];

const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN ?? "kyston.org";

export default function GoPage() {
  const [subdomain, setSubdomain] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [domainSuffix, setDomainSuffix] = useState(APP_DOMAIN);

  useEffect(() => {
    if (typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")) {
      setDomainSuffix("localhost");
    }
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const cleaned = subdomain.toLowerCase().trim().replace(/[^a-z0-9-]/g, "");
    if (!cleaned) {
      setError("Please enter your church subdomain.");
      return;
    }
    if (cleaned.length < 2) {
      setError("Subdomain must be at least 2 characters.");
      return;
    }
    if (RESERVED_SUBDOMAINS.includes(cleaned)) {
      setError("That subdomain is reserved.");
      return;
    }

    const appDomain = APP_DOMAIN;
    const isLocalhost =
      typeof window !== "undefined" &&
      (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
    const port = typeof window !== "undefined" && window.location.port ? `:${window.location.port}` : "";
    const proto = typeof window !== "undefined" ? window.location.protocol : "https:";

    const host = isLocalhost ? `${cleaned}.localhost${port}` : `${cleaned}.${appDomain}`;
    window.location.href = `${proto}//${host}`;
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center px-4 py-8 sm:py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-heading text-3xl font-bold text-base-content">Go to your church</h1>
          <p className="font-body text-base-content/70 mt-1">Enter your church subdomain to continue</p>
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
                  <span className="label-text font-body font-medium">Subdomain</span>
                </label>
                <div className="input-group">
                  <input
                    type="text"
                    placeholder="gracechurch"
                    className="input input-bordered rounded-lg w-full font-body placeholder-[#9ca3af] text-[#111827] rounded-r-none"
                    value={subdomain}
                    onChange={(e) => setSubdomain(e.target.value)}
                    aria-describedby="subdomain-hint"
                  />
                  <span className="input input-bordered rounded-lg rounded-l-none font-body text-base-content/60 bg-base-200 px-4 flex items-center">
                    .{domainSuffix}
                  </span>
                </div>
                <label id="subdomain-hint" className="label">
                  <span className="label-text-alt text-base-content/50">
                    Letters, numbers, and hyphens only
                  </span>
                </label>
              </div>
              <button type="submit" className="btn btn-primary w-full rounded-xl font-body min-h-[48px]">
                Go
              </button>
            </form>
            <Link href="/" className="btn btn-ghost btn-sm w-full rounded-xl font-body">
              Back to home
            </Link>
          </div>
        </div>
        <p className="text-center mt-6 font-body">
          <Link href="/login" className="link link-primary text-sm">Sign in</Link>
          {" · "}
          <Link href="/" className="link link-primary text-sm">Home</Link>
        </p>
      </div>
    </div>
  );
}
