export type PlanType = "free" | "pro" | "unlimited";

export const PLAN_LIMITS = {
  free: {
    facilitators: 3,
    students: 20,
    programs: 2,
    storageBytes: 500 * 1024 * 1024, // 500MB
    meetingIntegrations: 0,
    customBranding: false,
    certificates: false,
    smsNotifications: false,
  },
  pro: {
    facilitators: 10,
    students: 200,
    programs: 20,
    storageBytes: 5 * 1024 * 1024 * 1024, // 5GB
    meetingIntegrations: 1,
    customBranding: true,
    certificates: true,
    smsNotifications: false,
  },
  unlimited: {
    facilitators: Infinity,
    students: Infinity,
    programs: Infinity,
    storageBytes: 50 * 1024 * 1024 * 1024, // 50GB
    meetingIntegrations: Infinity,
    customBranding: true,
    certificates: true,
    smsNotifications: true,
  },
} as const;

export type PlanResource =
  | "facilitators"
  | "students"
  | "programs"
  | "storageBytes"
  | "meetingIntegrations";

export function getPlanLimit(
  plan: PlanType,
  resource: PlanResource
): number {
  return PLAN_LIMITS[plan][resource] as number;
}

export function checkPlanLimit(
  plan: PlanType,
  resource: PlanResource,
  currentCount: number
): { allowed: boolean; limit: number } {
  const limit = getPlanLimit(plan, resource);
  const allowed = currentCount < limit;
  return { allowed, limit };
}

export function canUseMeetingIntegration(
  plan: PlanType,
  currentIntegrationCount: number
): boolean {
  const { allowed } = checkPlanLimit(plan, "meetingIntegrations", currentIntegrationCount);
  return allowed;
}

export function canUseCustomBranding(plan: PlanType): boolean {
  return PLAN_LIMITS[plan].customBranding;
}

export function canUseCertificates(plan: PlanType): boolean {
  return PLAN_LIMITS[plan].certificates;
}

export function canUseSmsNotifications(plan: PlanType): boolean {
  return PLAN_LIMITS[plan].smsNotifications;
}
