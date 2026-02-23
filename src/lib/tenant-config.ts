import { db } from "@/lib/db";
import {
  churches,
  plans,
  churchPlanConfig,
  couponRedemptions,
  couponCodes,
  churchIntegrations,
  users,
  programs,
  courses,
} from "@/lib/db/schema";
import { eq, and, sql, desc } from "drizzle-orm";

const UNLIMITED = -1;

export type TenantLimitResource =
  | "facilitators"
  | "students"
  | "programs"
  | "courses"
  | "storageMb"
  | "integrations";

export interface TenantLimits {
  maxFacilitators: number;
  maxStudents: number;
  maxPrograms: number;
  maxCourses: number;
  maxStorageMb: number;
  integrationsMode: "none" | "auto" | "manual";
  allowedIntegrations: string[];
  customBranding: boolean;
  certificates: boolean;
  smsNotifications: boolean;
  analytics: boolean;
  prioritySupport: boolean;
  source: "coupon" | "manual_override" | "plan" | "free_default";
  sourceDetail?: string;
  expiresAt?: Date | null;
}

const FREE_DEFAULTS: Omit<TenantLimits, "source" | "sourceDetail" | "expiresAt"> = {
  maxFacilitators: 3,
  maxStudents: 20,
  maxPrograms: 2,
  maxCourses: 5,
  maxStorageMb: 500,
  integrationsMode: "none",
  allowedIntegrations: [],
  customBranding: false,
  certificates: false,
  smsNotifications: false,
  analytics: false,
  prioritySupport: false,
};

export async function getTenantLimits(churchId: string): Promise<TenantLimits> {
  const now = new Date();

  // 1. Check for active coupon redemption (highest priority)
  const [activeRedemption] = await db
    .select()
    .from(couponRedemptions)
    .where(
      and(
        eq(couponRedemptions.churchId, churchId),
        eq(couponRedemptions.isActive, true)
      )
    )
    .orderBy(desc(couponRedemptions.redeemedAt))
    .limit(1);

  if (activeRedemption) {
    const expiresAt = activeRedemption.expiresAt;
    if (!expiresAt || expiresAt > now) {
      const coupon = await db.query.couponCodes.findFirst({
        where: eq(couponCodes.id, activeRedemption.couponId),
      });
      if (coupon?.isActive) {
        if (coupon.grantType === "plan" && coupon.grantPlanId) {
          const plan = await db.query.plans.findFirst({
            where: eq(plans.id, coupon.grantPlanId),
          });
          if (plan) {
            return {
              ...FREE_DEFAULTS,
              maxFacilitators: plan.maxFacilitators === UNLIMITED ? Infinity : plan.maxFacilitators,
              maxStudents: plan.maxStudents === UNLIMITED ? Infinity : plan.maxStudents,
              maxPrograms: plan.maxPrograms === UNLIMITED ? Infinity : plan.maxPrograms,
              maxCourses: plan.maxCourses === UNLIMITED ? Infinity : plan.maxCourses,
              maxStorageMb: plan.maxStorageMb === UNLIMITED ? Infinity : plan.maxStorageMb,
              integrationsMode: plan.integrationsMode,
              allowedIntegrations: (plan.allowedIntegrations as string[]) ?? [],
              customBranding: plan.customBranding,
              certificates: plan.certificates,
              smsNotifications: plan.smsNotifications,
              analytics: plan.analytics,
              prioritySupport: plan.prioritySupport,
              source: "coupon",
              sourceDetail: coupon.code,
              expiresAt: activeRedemption.expiresAt,
            };
          }
        } else {
          return {
            ...FREE_DEFAULTS,
            maxFacilitators: coupon.grantMaxFacilitators === UNLIMITED || coupon.grantMaxFacilitators == null ? Infinity : coupon.grantMaxFacilitators,
            maxStudents: coupon.grantMaxStudents === UNLIMITED || coupon.grantMaxStudents == null ? Infinity : coupon.grantMaxStudents,
            maxPrograms: coupon.grantMaxPrograms === UNLIMITED || coupon.grantMaxPrograms == null ? Infinity : coupon.grantMaxPrograms,
            maxCourses: coupon.grantMaxCourses === UNLIMITED || coupon.grantMaxCourses == null ? Infinity : coupon.grantMaxCourses,
            maxStorageMb: coupon.grantMaxStorageMb === UNLIMITED || coupon.grantMaxStorageMb == null ? Infinity : coupon.grantMaxStorageMb,
            integrationsMode: (coupon.grantIntegrationsMode as "none" | "auto" | "manual") ?? "none",
            allowedIntegrations: (coupon.grantAllowedIntegrations as string[]) ?? [],
            customBranding: coupon.grantCustomBranding ?? false,
            certificates: coupon.grantCertificates ?? false,
            smsNotifications: coupon.grantSmsNotifications ?? false,
            analytics: false,
            prioritySupport: false,
            source: "coupon",
            sourceDetail: coupon.code,
            expiresAt: activeRedemption.expiresAt,
          };
        }
      }
    }
  }

  // 2. Check church_plan_config
  const config = await db.query.churchPlanConfig.findFirst({
    where: eq(churchPlanConfig.churchId, churchId),
  });

  if (config?.isManualOverride) {
    return {
      ...FREE_DEFAULTS,
      maxFacilitators: config.overrideMaxFacilitators === UNLIMITED || config.overrideMaxFacilitators == null ? Infinity : config.overrideMaxFacilitators,
      maxStudents: config.overrideMaxStudents === UNLIMITED || config.overrideMaxStudents == null ? Infinity : config.overrideMaxStudents,
      maxPrograms: config.overrideMaxPrograms === UNLIMITED || config.overrideMaxPrograms == null ? Infinity : config.overrideMaxPrograms,
      maxCourses: config.overrideMaxCourses === UNLIMITED || config.overrideMaxCourses == null ? Infinity : config.overrideMaxCourses,
      maxStorageMb: config.overrideMaxStorageMb === UNLIMITED || config.overrideMaxStorageMb == null ? Infinity : config.overrideMaxStorageMb,
      integrationsMode: (config.overrideIntegrationsMode as "none" | "auto" | "manual") ?? "none",
      allowedIntegrations: (config.overrideAllowedIntegrations as string[]) ?? [],
      customBranding: config.overrideCustomBranding ?? false,
      certificates: config.overrideCertificates ?? false,
      smsNotifications: config.overrideSmsNotifications ?? false,
      analytics: config.overrideAnalytics ?? false,
      prioritySupport: false,
      source: "manual_override",
    };
  }

  // 3. Use assigned plan
  if (config?.planId) {
    const plan = await db.query.plans.findFirst({
      where: eq(plans.id, config.planId),
    });
    if (plan?.isActive) {
      return {
        ...FREE_DEFAULTS,
        maxFacilitators: plan.maxFacilitators === UNLIMITED ? Infinity : plan.maxFacilitators,
        maxStudents: plan.maxStudents === UNLIMITED ? Infinity : plan.maxStudents,
        maxPrograms: plan.maxPrograms === UNLIMITED ? Infinity : plan.maxPrograms,
        maxCourses: plan.maxCourses === UNLIMITED ? Infinity : plan.maxCourses,
        maxStorageMb: plan.maxStorageMb === UNLIMITED ? Infinity : plan.maxStorageMb,
        integrationsMode: plan.integrationsMode,
        allowedIntegrations: (plan.allowedIntegrations as string[]) ?? [],
        customBranding: plan.customBranding,
        certificates: plan.certificates,
        smsNotifications: plan.smsNotifications,
        analytics: plan.analytics,
        prioritySupport: plan.prioritySupport,
        source: "plan",
        sourceDetail: plan.name,
      };
    }
  }

  // 4. Fall back to churches.plan (legacy enum)
  const church = await db.query.churches.findFirst({
    where: eq(churches.id, churchId),
    columns: { plan: true },
  });

  const legacyPlan = church?.plan ?? "free";
  const legacyMap = {
    free: { ...FREE_DEFAULTS },
    pro: {
      ...FREE_DEFAULTS,
      maxFacilitators: 10,
      maxStudents: 200,
      maxPrograms: 20,
      maxCourses: 50,
      maxStorageMb: 5120,
      integrationsMode: "auto" as const,
      allowedIntegrations: ["zoom", "teams", "google_meet"],
      customBranding: true,
      certificates: true,
      smsNotifications: false,
      analytics: false,
      prioritySupport: false,
    },
    unlimited: {
      ...FREE_DEFAULTS,
      maxFacilitators: Infinity,
      maxStudents: Infinity,
      maxPrograms: Infinity,
      maxCourses: Infinity,
      maxStorageMb: 51200,
      integrationsMode: "auto" as const,
      allowedIntegrations: ["zoom", "teams", "google_meet"],
      customBranding: true,
      certificates: true,
      smsNotifications: true,
      analytics: true,
      prioritySupport: true,
    },
  };

  return {
    ...legacyMap[legacyPlan],
    source: "plan",
    sourceDetail: legacyPlan,
  };
}

export async function checkLimit(
  churchId: string,
  resource: TenantLimitResource
): Promise<{ allowed: boolean; current: number; max: number }> {
  const limits = await getTenantLimits(churchId);

  const getCurrent = async (): Promise<number> => {
    switch (resource) {
      case "facilitators": {
        const [r] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(users)
          .where(and(eq(users.churchId, churchId), eq(users.role, "facilitator")));
        return r?.count ?? 0;
      }
      case "students": {
        const [r] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(users)
          .where(and(eq(users.churchId, churchId), eq(users.role, "student")));
        return r?.count ?? 0;
      }
      case "programs": {
        const [r] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(programs)
          .where(eq(programs.churchId, churchId));
        return r?.count ?? 0;
      }
      case "courses": {
        const [r] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(courses)
          .where(eq(courses.churchId, churchId));
        return r?.count ?? 0;
      }
      case "integrations": {
        const [r] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(churchIntegrations)
          .where(and(eq(churchIntegrations.churchId, churchId), eq(churchIntegrations.isActive, true)));
        return r?.count ?? 0;
      }
      case "storageMb":
        return 0;
      default:
        return 0;
    }
  };

  const maxMap: Record<TenantLimitResource, number> = {
    facilitators: limits.maxFacilitators,
    students: limits.maxStudents,
    programs: limits.maxPrograms,
    courses: limits.maxCourses,
    storageMb: limits.maxStorageMb,
    integrations: limits.integrationsMode === "none" ? 0 : limits.allowedIntegrations.length,
  };

  const max = maxMap[resource] ?? 0;
  const current = await getCurrent();
  const allowed = current < max;
  return { allowed, current, max };
}

export function canConnectIntegration(
  limits: TenantLimits,
  platform: "zoom" | "teams" | "google_meet",
  currentIntegrationCount: number
): boolean {
  if (limits.integrationsMode === "none") return false;
  if (!limits.allowedIntegrations.includes(platform)) return false;
  return currentIntegrationCount < limits.allowedIntegrations.length;
}

export type LimitUsageItem = { current: number; max: number; status: "unlimited" | "ok" | "approaching" | "at_limit" };

export async function getTenantLimitUsageSummary(churchId: string): Promise<{
  limits: TenantLimits;
  usage: {
    facilitators: LimitUsageItem;
    students: LimitUsageItem;
    programs: LimitUsageItem;
    courses: LimitUsageItem;
    storageMb: LimitUsageItem;
  };
}> {
  const limits = await getTenantLimits(churchId);
  const [fac, stud, prog, cour] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(users).where(and(eq(users.churchId, churchId), eq(users.role, "facilitator"))),
    db.select({ count: sql<number>`count(*)::int` }).from(users).where(and(eq(users.churchId, churchId), eq(users.role, "student"))),
    db.select({ count: sql<number>`count(*)::int` }).from(programs).where(eq(programs.churchId, churchId)),
    db.select({ count: sql<number>`count(*)::int` }).from(courses).where(eq(courses.churchId, churchId)),
  ]);
  const toItem = (current: number, max: number): LimitUsageItem => {
    if (max === Infinity || max < 0) return { current, max: Infinity, status: "unlimited" };
    if (current >= max) return { current, max, status: "at_limit" };
    if (current >= Math.floor(max * 0.8)) return { current, max, status: "approaching" };
    return { current, max, status: "ok" };
  };
  return {
    limits,
    usage: {
      facilitators: toItem(fac[0]?.count ?? 0, limits.maxFacilitators),
      students: toItem(stud[0]?.count ?? 0, limits.maxStudents),
      programs: toItem(prog[0]?.count ?? 0, limits.maxPrograms),
      courses: toItem(cour[0]?.count ?? 0, limits.maxCourses),
      storageMb: toItem(0, limits.maxStorageMb),
    },
  };
}
