"use server";

import { db } from "@/lib/db";
import { couponCodes } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { users } from "@/lib/db/schema";

const PLATFORMS = ["zoom", "teams", "google_meet"] as const;

export async function createCoupon(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  const me = await db.query.users.findFirst({
    where: eq(users.id, user.id),
    columns: { role: true },
  });
  if (me?.role !== "super_admin") throw new Error("Unauthorized");

  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  if (!code) throw new Error("Code is required");

  const grantType = (formData.get("grantType") as "plan" | "manual_config") ?? "plan";
  const grantPlanId = grantType === "plan" ? String(formData.get("grantPlanId") ?? "").trim() || null : null;

  const durationType = (formData.get("durationType") as "permanent" | "days" | "months") ?? "permanent";
  const durationValueStr = formData.get("durationValue");
  const durationValue = durationValueStr ? parseInt(String(durationValueStr), 10) : null;

  const expiresAtStr = formData.get("expiresAt");
  const expiresAt = expiresAtStr ? new Date(String(expiresAtStr)) : null;

  const maxRedemptionsStr = formData.get("maxRedemptions");
  const maxRedemptions = maxRedemptionsStr ? parseInt(String(maxRedemptionsStr), 10) : null;

  const allowed: string[] = [];
  for (const p of PLATFORMS) {
    if (formData.get(`grant_allowed_${p}`)) allowed.push(p);
  }

  function parseLimit(val: FormDataEntryValue | null): number | null {
    const s = val ? String(val).trim() : "";
    if (s === "" || s === "-") return null;
    const n = parseInt(s, 10);
    return Number.isNaN(n) ? null : n;
  }

  await db.insert(couponCodes).values({
    code,
    description: String(formData.get("description") ?? "").trim() || null,
    grantType,
    grantPlanId: grantPlanId || null,
    grantMaxFacilitators: grantType === "manual_config" ? parseLimit(formData.get("grantMaxFacilitators")) : null,
    grantMaxStudents: grantType === "manual_config" ? parseLimit(formData.get("grantMaxStudents")) : null,
    grantMaxPrograms: grantType === "manual_config" ? parseLimit(formData.get("grantMaxPrograms")) : null,
    grantMaxCourses: grantType === "manual_config" ? parseLimit(formData.get("grantMaxCourses")) : null,
    grantMaxStorageMb: grantType === "manual_config" ? parseLimit(formData.get("grantMaxStorageMb")) : null,
    grantIntegrationsMode: grantType === "manual_config" ? (formData.get("grantIntegrationsMode") as "none" | "auto" | "manual") ?? null : null,
    grantAllowedIntegrations: grantType === "manual_config" && allowed.length > 0 ? allowed : null,
    grantCustomBranding: grantType === "manual_config" ? (formData.get("grantCustomBranding") === "on" ? true : null) : null,
    grantCertificates: grantType === "manual_config" ? (formData.get("grantCertificates") === "on" ? true : null) : null,
    grantSmsNotifications: grantType === "manual_config" ? (formData.get("grantSmsNotifications") === "on" ? true : null) : null,
    durationType,
    durationValue,
    expiresAt,
    maxRedemptions,
    isActive: true,
    createdBy: user.id,
  });

  revalidatePath("/superadmin/coupons");
}
