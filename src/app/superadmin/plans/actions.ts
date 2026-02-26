"use server";

import { db } from "@/lib/db";
import { plans } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

const PLATFORMS = ["zoom", "teams", "google_meet"] as const;

function parseFormLimits(formData: FormData): {
  maxFacilitators: number;
  maxStudents: number;
  maxPrograms: number;
  maxCourses: number;
  maxStorageMb: number;
} {
  const get = (k: string, def: number) => {
    const v = formData.get(k);
    if (v === null || v === "") return def;
    const n = parseInt(String(v), 10);
    return Number.isNaN(n) ? def : Math.max(0, n);
  };
  return {
    maxFacilitators: get("maxFacilitators", 3),
    maxStudents: get("maxStudents", 20),
    maxPrograms: get("maxPrograms", 2),
    maxCourses: get("maxCourses", 5),
    maxStorageMb: get("maxStorageMb", 500),
  };
}

function parsePrice(v: FormDataEntryValue | null): string | null {
  if (v === null || v === "") return null;
  const n = parseFloat(String(v));
  return Number.isNaN(n) || n < 0 ? null : n.toFixed(2);
}

export async function createPlan(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim().toLowerCase().replace(/\s+/g, "-");
  if (!name || !slug) throw new Error("Name and slug are required");

  const limits = parseFormLimits(formData);
  const allowed: string[] = [];
  for (const p of PLATFORMS) {
    if (formData.get(`allowed_${p}`)) allowed.push(p);
  }

  await db.insert(plans).values({
    name,
    slug,
    description: String(formData.get("description") ?? "").trim() || null,
    isPublic: formData.get("isPublic") === "on",
    isActive: formData.get("isActive") === "on",
    priceMonthly: parsePrice(formData.get("priceMonthly") as string | null),
    priceYearly: parsePrice(formData.get("priceYearly") as string | null),
    stripePriceIdMonthly: String(formData.get("stripePriceIdMonthly") ?? "").trim() || null,
    stripePriceIdYearly: String(formData.get("stripePriceIdYearly") ?? "").trim() || null,
    ...limits,
    integrationsMode: (formData.get("integrationsMode") as "none" | "auto" | "manual") ?? "none",
    allowedIntegrations: allowed,
    customBranding: formData.get("customBranding") === "on",
    certificates: formData.get("certificates") === "on",
    smsNotifications: formData.get("smsNotifications") === "on",
    analytics: formData.get("analytics") === "on",
    prioritySupport: formData.get("prioritySupport") === "on",
    sortOrder: parseInt(String(formData.get("sortOrder") ?? "0"), 10) || 0,
  });

  revalidatePath("/superadmin/plans");
}

export async function updatePlan(id: string, formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim().toLowerCase().replace(/\s+/g, "-");
  if (!name || !slug) throw new Error("Name and slug are required");

  const limits = parseFormLimits(formData);
  const allowed: string[] = [];
  for (const p of PLATFORMS) {
    if (formData.get(`allowed_${p}`)) allowed.push(p);
  }

  await db
    .update(plans)
    .set({
      name,
      slug,
      description: String(formData.get("description") ?? "").trim() || null,
      isPublic: formData.get("isPublic") === "on",
      isActive: formData.get("isActive") === "on",
      priceMonthly: parsePrice(formData.get("priceMonthly") as string | null),
      priceYearly: parsePrice(formData.get("priceYearly") as string | null),
      stripePriceIdMonthly: String(formData.get("stripePriceIdMonthly") ?? "").trim() || null,
      stripePriceIdYearly: String(formData.get("stripePriceIdYearly") ?? "").trim() || null,
      ...limits,
      integrationsMode: (formData.get("integrationsMode") as "none" | "auto" | "manual") ?? "none",
      allowedIntegrations: allowed,
      customBranding: formData.get("customBranding") === "on",
      certificates: formData.get("certificates") === "on",
      smsNotifications: formData.get("smsNotifications") === "on",
      analytics: formData.get("analytics") === "on",
      prioritySupport: formData.get("prioritySupport") === "on",
      sortOrder: parseInt(String(formData.get("sortOrder") ?? "0"), 10) || 0,
      updatedAt: new Date(),
    })
    .where(eq(plans.id, id));

  revalidatePath("/superadmin/plans");
  revalidatePath(`/superadmin/plans/${id}/edit`);
}
