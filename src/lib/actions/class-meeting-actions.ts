"use server";

import { db } from "@/lib/db";
import { churchIntegrations, classes, courses, users } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { getTenantLimits } from "@/lib/tenant-config";
import { createClassMeeting, deleteClassMeeting, updateClassMeeting } from "@/lib/services/meeting-service";
import type { MeetingPlatform } from "@/lib/integrations";
import { getTenant } from "@/lib/tenant";
import { createClient } from "@/lib/supabase/server";

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

/**
 * Removes the meeting from the class: deletes the Teams meeting in Graph (if applicable) and clears
 * meetingUrl, meetingId, meetingRecurrence on the class. Returns { success: true } or { error }.
 */
export async function removeClassMeetingAction(params: {
  classId: string;
  churchId: string;
}): Promise<{ success: true } | { success: false; error: string }> {
  const tenant = await getTenant();
  if (!tenant) return { success: false, error: "Forbidden" };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Unauthorized" };
  const u = await db.query.users.findFirst({
    where: eq(users.id, user.id),
    columns: { role: true, churchId: true },
  });
  const canAdmin = (u?.role === "church_admin" || u?.role === "super_admin") && u?.churchId === tenant.churchId;
  if (!canAdmin) return { success: false, error: "Forbidden" };
  if (params.churchId !== tenant.churchId) return { success: false, error: "Forbidden" };

  const result = await deleteClassMeeting({ classId: params.classId, churchId: params.churchId });
  if (result.success) return { success: true };
  return { success: false, error: result.reason };
}

/**
 * Updates the existing Teams meeting for the class (subject, time, recurrence).
 * If update is not possible, deletes the old meeting and creates a new one.
 */
export async function updateClassMeetingLinkAction(params: {
  classId: string;
  churchId: string;
  timezone?: string;
}): Promise<{ success: true } | { success: false; error: string }> {
  const tenant = await getTenant();
  if (!tenant) return { success: false, error: "Forbidden" };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Unauthorized" };
  const u = await db.query.users.findFirst({
    where: eq(users.id, user.id),
    columns: { role: true, churchId: true },
  });
  const canAdmin = (u?.role === "church_admin" || u?.role === "super_admin") && u?.churchId === tenant.churchId;
  if (!canAdmin) return { success: false, error: "Forbidden" };
  if (params.churchId !== tenant.churchId) return { success: false, error: "Forbidden" };

  const result = await updateClassMeeting({
    classId: params.classId,
    churchId: params.churchId,
    timezone: params.timezone,
  });
  if (result.success) return { success: true };
  return { success: false, error: result.reason };
}

/**
 * Deletes the class (and its Teams meeting if applicable). Returns { success: true } or { error }.
 */
export async function deleteClassAction(params: {
  classId: string;
  churchId: string;
}): Promise<{ success: true } | { success: false; error: string }> {
  const tenant = await getTenant();
  if (!tenant) return { success: false, error: "Forbidden" };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Unauthorized" };
  const u = await db.query.users.findFirst({
    where: eq(users.id, user.id),
    columns: { role: true, churchId: true },
  });
  const canAdmin = (u?.role === "church_admin" || u?.role === "super_admin") && u?.churchId === tenant.churchId;
  if (!canAdmin) return { success: false, error: "Forbidden" };
  if (params.churchId !== tenant.churchId) return { success: false, error: "Forbidden" };

  const exists = await db.query.classes.findFirst({
    where: and(eq(classes.id, params.classId), eq(classes.churchId, tenant.churchId)),
    columns: { id: true },
  });
  if (!exists) return { success: false, error: "Class not found" };

  await deleteClassMeeting({ classId: params.classId, churchId: params.churchId });
  await db.delete(classes).where(and(eq(classes.id, params.classId), eq(classes.churchId, tenant.churchId)));
  return { success: true };
}

/**
 * Generates a meeting link for the class using current saved class data (platform, date/time, duration, recurrence).
 * Call from the edit class screen. Pass timezone from the client (e.g. Intl.DateTimeFormat().resolvedOptions().timeZone).
 */
export async function generateClassMeetingLinkAction(params: {
  classId: string;
  churchId: string;
  timezone?: string;
}): Promise<{ success: true } | { success: false; error: string }> {
  const tenant = await getTenant();
  if (!tenant) return { success: false, error: "Forbidden" };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Unauthorized" };
  const u = await db.query.users.findFirst({
    where: eq(users.id, user.id),
    columns: { role: true, churchId: true },
  });
  const canAdmin = (u?.role === "church_admin" || u?.role === "super_admin") && u?.churchId === tenant.churchId;
  if (!canAdmin) return { success: false, error: "Forbidden" };
  if (params.churchId !== tenant.churchId) return { success: false, error: "Forbidden" };

  const cls = await db.query.classes.findFirst({
    where: and(eq(classes.id, params.classId), eq(classes.churchId, tenant.churchId)),
    columns: {
      name: true,
      meetingPlatform: true,
      meetingScheduledAt: true,
      meetingDurationMinutes: true,
      courseId: true,
    },
  });
  if (!cls) return { success: false, error: "Class not found" };
  if (cls.meetingPlatform === "none" || !["zoom", "teams", "google_meet"].includes(cls.meetingPlatform)) {
    return { success: false, error: "Set a meeting platform (Zoom, Teams, or Google Meet) and save first." };
  }
  if (!cls.meetingScheduledAt) {
    return { success: false, error: "Set meeting date & time and save first." };
  }

  const course = await db.query.courses.findFirst({
    where: eq(courses.id, cls.courseId),
    columns: { name: true },
  });

  const result = await createClassMeeting({
    classId: params.classId,
    churchId: params.churchId,
    platform: cls.meetingPlatform as MeetingPlatform,
    className: cls.name,
    courseName: course?.name,
    startTime: cls.meetingScheduledAt instanceof Date ? cls.meetingScheduledAt : new Date(cls.meetingScheduledAt),
    durationMinutes: cls.meetingDurationMinutes ?? 60,
    timezone: params.timezone ?? "UTC",
  });
  if (result.success) return { success: true };
  return { success: false, error: result.reason };
}
