"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type BannerType = "gradient" | "color" | "image" | null;

export default function SettingsForm({
  churchId,
  customBranding,
  initial,
}: {
  churchId: string;
  customBranding: boolean;
  initial: {
    name: string;
    primaryColor: string;
    subdomain: string;
    logoUrl: string | null;
    secondaryColor: string | null;
    bannerType: BannerType;
    bannerImageUrl: string | null;
    bannerColor: string | null;
  };
}) {
  const [name, setName] = useState(initial.name);
  const [primaryColor, setPrimaryColor] = useState(initial.primaryColor);
  const [logoUrl, setLogoUrl] = useState<string | null>(initial.logoUrl);
  const [secondaryColor, setSecondaryColor] = useState(initial.secondaryColor ?? "");
  const [bannerType, setBannerType] = useState<BannerType>(initial.bannerType ?? "gradient");
  const [bannerImageUrl, setBannerImageUrl] = useState<string | null>(initial.bannerImageUrl);
  const [bannerColor, setBannerColor] = useState(initial.bannerColor ?? "#9333ea");
  const [logoUploading, setLogoUploading] = useState(false);
  const [bannerUploading, setBannerUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const logoInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setName(initial.name); }, [initial.name]);
  useEffect(() => { setPrimaryColor(initial.primaryColor); }, [initial.primaryColor]);
  useEffect(() => { setLogoUrl(initial.logoUrl); }, [initial.logoUrl]);
  useEffect(() => { setSecondaryColor(initial.secondaryColor ?? ""); }, [initial.secondaryColor]);
  useEffect(() => { setBannerType(initial.bannerType ?? "gradient"); }, [initial.bannerType]);
  useEffect(() => { setBannerImageUrl(initial.bannerImageUrl); }, [initial.bannerImageUrl]);
  useEffect(() => { setBannerColor(initial.bannerColor ?? "#9333ea"); }, [initial.bannerColor]);

  // Ensure storage bucket is public (fixes broken images)
  useEffect(() => {
    if (customBranding) fetch("/api/admin/ensure-storage", { method: "POST" }).catch(() => {});
  }, [customBranding]);

  async function uploadFile(type: "logo" | "banner", file: File) {
    const setUploading = type === "logo" ? setLogoUploading : setBannerUploading;
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.set("type", type);
      formData.set("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      if (type === "logo") setLogoUrl(data.url);
      else setBannerImageUrl(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) uploadFile("logo", file);
    e.target.value = "";
  }

  function handleBannerImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) uploadFile("banner", file);
    e.target.value = "";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          churchId,
          name,
          primaryColor,
          ...(customBranding && {
            logoUrl,
            secondaryColor: secondaryColor || null,
            bannerType,
            bannerImageUrl: bannerType === "image" ? bannerImageUrl : null,
            bannerColor: bannerType !== "image" ? bannerColor : null,
          }),
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Failed");
        setLoading(false);
        return;
      }
      router.refresh();
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      <div className="card bg-white shadow-sm rounded-2xl border border-[#e5e7eb]">
        <div className="card-body gap-6">
          <h2 className="font-heading text-xl font-bold">Church profile</h2>
          <div className="form-control w-full">
            <label className="label">
              <span className="label-text font-body font-medium text-base-content">Church name</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Grace Church"
              className="input input-bordered rounded-lg w-full font-body placeholder-[#9ca3af] text-[#111827] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="form-control w-full">
            <label className="label">
              <span className="label-text font-body font-medium text-base-content">Primary color</span>
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                className="h-10 w-14 rounded-lg cursor-pointer border border-[#e5e7eb] transition-all duration-200"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
              />
              <span className="font-body text-sm text-base-content/70">{primaryColor}</span>
            </div>
          </div>
          <p className="font-body text-sm text-base-content/50">Subdomain: {initial.subdomain} (read-only)</p>
        </div>
      </div>

      <div className="card bg-white shadow-sm rounded-2xl border border-[#e5e7eb]">
        <div className="card-body gap-6">
          <h2 className="font-heading text-xl font-bold">Branding</h2>
          {!customBranding ? (
            <div className="rounded-xl bg-base-200/50 p-4 border border-base-300">
              <p className="font-body text-sm text-base-content/80 mb-3">
                Custom branding (logo, banner, and colors) is available on paid plans.
              </p>
              <Link href="/admin/billing" className="btn btn-primary btn-sm rounded-xl font-body">
                Upgrade plan
              </Link>
            </div>
          ) : (
            <>
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text font-body font-medium text-base-content">Logo</span>
                </label>
                <div className="flex items-center gap-3 flex-wrap">
                  {logoUrl && (
                    <img src={logoUrl} alt="Logo preview" className="h-12 object-contain rounded-lg border border-base-300" />
                  )}
                  <div className="flex items-center gap-2">
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/svg+xml"
                      className="hidden"
                      onChange={handleLogoChange}
                      disabled={logoUploading}
                    />
                    <button
                      type="button"
                      onClick={() => logoInputRef.current?.click()}
                      className="btn btn-outline btn-sm rounded-xl font-body"
                      disabled={logoUploading}
                    >
                      {logoUploading ? "Uploading…" : logoUrl ? "Change logo" : "Upload logo"}
                    </button>
                    {logoUrl && (
                      <button
                        type="button"
                        onClick={() => setLogoUrl(null)}
                        className="btn btn-ghost btn-sm rounded-xl font-body text-error"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
                <p className="font-body text-xs text-base-content/50 mt-1">JPEG, PNG, WebP, or SVG. Max 2MB.</p>
              </div>

              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text font-body font-medium text-base-content">Secondary color</span>
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    className="h-10 w-14 rounded-lg cursor-pointer border border-[#e5e7eb] transition-all duration-200"
                    value={secondaryColor || "#9333ea"}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                  />
                  <input
                    type="text"
                    className="input input-bordered input-sm w-28 rounded-lg font-body"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    placeholder="#9333ea"
                  />
                </div>
              </div>

              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text font-body font-medium text-base-content">Hero banner</span>
                </label>
                <div className="flex gap-4 mb-3">
                  {(["gradient", "color", "image"] as const).map((t) => (
                    <label key={t} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="bannerType"
                        checked={bannerType === t}
                        onChange={() => setBannerType(t)}
                        className="radio radio-primary radio-sm"
                      />
                      <span className="font-body text-sm capitalize">{t}</span>
                    </label>
                  ))}
                </div>
                {bannerType !== "image" && (
                  <div className="flex items-center gap-3 mb-3">
                    <label className="font-body text-sm text-base-content/70">Banner color{bannerType === "gradient" ? " (start)" : ""}:</label>
                    <input
                      type="color"
                      className="h-10 w-14 rounded-lg cursor-pointer border border-[#e5e7eb]"
                      value={bannerColor}
                      onChange={(e) => setBannerColor(e.target.value)}
                    />
                    <span className="font-body text-sm text-base-content/70">{bannerColor}</span>
                  </div>
                )}
                {bannerType === "image" && (
                  <div className="flex items-center gap-3 flex-wrap">
                    {bannerImageUrl && (
                      <img src={bannerImageUrl} alt="Banner preview" className="h-20 object-cover rounded-lg border border-base-300 max-w-xs" />
                    )}
                    <div className="flex items-center gap-2">
                      <input
                        ref={bannerInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={handleBannerImageChange}
                        disabled={bannerUploading}
                      />
                      <button
                        type="button"
                        onClick={() => bannerInputRef.current?.click()}
                        className="btn btn-outline btn-sm rounded-xl font-body"
                        disabled={bannerUploading}
                      >
                        {bannerUploading ? "Uploading…" : bannerImageUrl ? "Change image" : "Upload image"}
                      </button>
                      {bannerImageUrl && (
                        <button
                          type="button"
                          onClick={() => setBannerImageUrl(null)}
                          className="btn btn-ghost btn-sm rounded-xl font-body text-error"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {error && <p className="text-error font-body text-sm">{error}</p>}
      <div className="flex justify-end gap-3">
        <button type="button" onClick={() => router.back()} className="btn btn-ghost rounded-xl font-body">
          Cancel
        </button>
        <button type="submit" className="btn btn-primary rounded-xl font-body" disabled={loading}>
          {loading ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}
