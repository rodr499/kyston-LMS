"use server";

import { db } from "@/lib/db";
import { churchIntegrations } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { getTenantLimits } from "@/lib/tenant-config";
import { createClassMeeting } from "@/lib/services/meeting-service";
import type { MeetingPlatform } from "@/lib/integrations";

export type MeetingEligibilityMode = "auto" | "manual" | "none";

export interface CheckMeetingEligibilityResult {
  mode: MeetingEligibilityMode;
  reason?: string;
}

/**
 * Called when the user changes the meeting platform in the class form.
 * Returns whether to show auto message, manual URL input (with reason), or hide meeting fields.
 */
export async function checkMeetingEligibilityAction(
  churchId: string,
  platform: string
): Promise<CheckMeetingEligibilityResult> {
  if (platform === "none" || !churchId) {
    return { mode: "none" };
  }

  const limits = await getTenantLimits(churchId);
  if (limits.integrationsMode === "none") {
    return { mode: "none" };
  }

  const allowed = limits.allowedIntegrations ?? [];
  const platformKey = platform as MeetingPlatform;
  if (!["zoom", "teams", "google_meet"].includes(platform) || !allowed.includes(platformKey)) {
    return {
      mode: "manual",
      reason: "This platform is not included in your plan. Add a meeting link manually.",
    };
  }

  if (limits.integrationsMode === "manual") {
    return {
      mode: "manual",
      reason: "Your plan uses manual meeting links. Enter the meeting URL below.",
    };
  }

  const integration = await db.query.churchIntegrations.findFirst({
    where: and(
      eq(churchIntegrations.churchId, churchId),
      eq(churchIntegrations.platform, platformKey),
      eq(churchIntegrations.isActive, true)
    ),
    columns: { id: true },
  });

  if (!integration) {
    return {
      mode: "manual",
      reason: "Connect this platform in Settings → Integrations to create meetings automatically, or add a link manually.",
    };
  }

  return { mode: "auto" };
}

export interface CreateClassMeetingActionParams {
  classId: string;
  churchId: string;
  platform: MeetingPlatform;
  className: string;
  courseName?: string;
  startTime: Date;
  durationMinutes: number;
  timezone?: string;
}

/**
 * Called after the class is saved. Creates the meeting via the service and updates the class.
 * Best-effort: class is already saved; on failure show a non-blocking message.
 */
export async function createClassMeetingAction(
  params: CreateClassMeetingActionParams
): Promise<{ success: boolean; reason?: string }> {
  const result = await createClassMeeting({
    ...params,
    startTime: params.startTime instanceof Date ? params.startTime : new Date(params.startTime),
  });
  if (result.success) return { success: true };
  return { success: false, reason: result.reason };
}
