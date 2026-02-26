"use server";

import { db } from "@/lib/db";
import { churchPlanConfig } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { createClient } from "@/lib/supabase/server";
import { users } from "@/lib/db/schema";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";

export async function applyPlan(churchId: string, formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  const me = await db.query.users.findFirst({
    where: eq(users.id, user.id),
    columns: { role: true },
  });
  if (me?.role !== "super_admin") throw new Error("Unauthorized");

  const planId = String(formData.get("planId") ?? "").trim() || null;

  const existing = await db.query.churchPlanConfig.findFirst({
    where: eq(churchPlanConfig.churchId, churchId),
  });

  if (existing) {
    await db
      .update(churchPlanConfig)
      .set({
        planId,
        isManualOverride: false,
        lastModifiedBy: user.id,
        lastModifiedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(churchPlanConfig.id, existing.id));
  } else {
    await db.insert(churchPlanConfig).values({
      churchId,
      planId,
      isManualOverride: false,
      lastModifiedBy: user.id,
      lastModifiedAt: new Date(),
    });
  }

  await logAudit({
    actorId: user.id,
    action: "plan_assigned",
    targetType: "church",
    targetId: churchId,
    metadata: { planId },
  });

  revalidatePath(`/superadmin/tenants/${churchId}`);
}

export async function saveManualOverride(churchId: string, formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  const me = await db.query.users.findFirst({
    where: eq(users.id, user.id),
    columns: { role: true },
  });
  if (me?.role !== "super_admin") throw new Error("Unauthorized");

  const isManualOverride = formData.get("isManualOverride") === "on";
  const adminNotes = String(formData.get("adminNotes") ?? "").trim() || null;

  const existing = await db.query.churchPlanConfig.findFirst({
    where: eq(churchPlanConfig.churchId, churchId),
  });

  const parseLimit = (key: string, fallback: number): number => {
    const n = parseInt(String(formData.get(key) ?? fallback), 10);
    return Number.isNaN(n) ? fallback : Math.max(0, n);
  };

  const overrideValues = isManualOverride
    ? {
        overrideMaxFacilitators: parseLimit("overrideMaxFacilitators", 3),
        overrideMaxStudents: parseLimit("overrideMaxStudents", 20),
        overrideMaxPrograms: parseLimit("overrideMaxPrograms", 2),
        overrideMaxCourses: parseLimit("overrideMaxCourses", 5),
        overrideMaxStorageMb: parseLimit("overrideMaxStorageMb", 500),
      }
    : ({} as Record<string, never>);

  if (existing) {
    await db
      .update(churchPlanConfig)
      .set({
        isManualOverride,
        adminNotes,
        lastModifiedBy: user.id,
        lastModifiedAt: new Date(),
        updatedAt: new Date(),
        ...(isManualOverride ? overrideValues : {}),
      })
      .where(eq(churchPlanConfig.id, existing.id));
  } else {
    await db.insert(churchPlanConfig).values({
      churchId,
      isManualOverride,
      adminNotes,
      lastModifiedBy: user.id,
      lastModifiedAt: new Date(),
      ...(isManualOverride ? overrideValues : {}),
    });
  }

  await logAudit({
    actorId: user.id,
    action: "manual_override_set",
    targetType: "church",
    targetId: churchId,
    metadata: { isManualOverride },
  });

  revalidatePath(`/superadmin/tenants/${churchId}`);
}
