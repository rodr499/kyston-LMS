/**
 * Orchestrates auto-creation of Zoom / Teams / Google Meet meetings when a class is saved.
 * Resolves plan limits, loads/refreshes OAuth tokens, calls the platform API, and updates the class.
 * Also supports deleting the Teams meeting (Graph API) and clearing the class meeting fields.
 */
import { db } from "@/lib/db";
import { churchIntegrations, classes, courses, users } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { getTenantLimits } from "@/lib/tenant-config";
import { getMeetingProvider } from "@/lib/integrations";
import type { MeetingPlatform } from "@/lib/integrations";
import {
  deleteOnlineMeeting,
  deleteCalendarEvent,
  updateCalendarEvent,
  createRecurringMeeting,
  createMeeting,
} from "@/lib/integrations/teams";
import { teamsProvider } from "@/lib/integrations/teams-provider";

export interface CreateClassMeetingParams {
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
 * Creates a meeting for the given class and writes meetingUrl (and meetingId for Zoom) back to the class.
 * Returns { success: true } or { success: false, reason }.
 */
export async function createClassMeeting(params: CreateClassMeetingParams): Promise<
  | { success: true }
  | { success: false; reason: string }
> {
  const { classId, churchId, platform, className, courseName, startTime, durationMinutes, timezone } = params;

  const limits = await getTenantLimits(churchId);
  if (limits.integrationsMode !== "auto") {
    return { success: false, reason: "Auto meetings not enabled for this plan." };
  }
  const allowed = limits.allowedIntegrations ?? [];
  if (!allowed.includes(platform)) {
    return { success: false, reason: "This meeting platform is not allowed for your plan." };
  }

  const integration = await db.query.churchIntegrations.findFirst({
    where: and(
      eq(churchIntegrations.churchId, churchId),
      eq(churchIntegrations.platform, platform),
      eq(churchIntegrations.isActive, true)
    ),
    columns: { id: true, accessToken: true, refreshToken: true, tokenExpiresAt: true, metadata: true },
  });

  if (!integration?.accessToken) {
    return { success: false, reason: "Connect this platform in Settings → Integrations." };
  }

  let accessToken = integration.accessToken;
  let refreshToken = integration.refreshToken;
  let tokenExpiresAt = integration.tokenExpiresAt;
  const provider = getMeetingProvider(platform);

  // Always refresh when we have a refresh_token so we never use an expired access token
  if (provider.refreshTokens && refreshToken) {
    try {
      const next = await provider.refreshTokens({
        accessToken: integration.accessToken,
        refreshToken: integration.refreshToken,
        tokenExpiresAt: integration.tokenExpiresAt,
      });
      accessToken = next.accessToken;
      refreshToken = next.refreshToken ?? refreshToken;
      tokenExpiresAt = next.tokenExpiresAt ?? null;
      await db
        .update(churchIntegrations)
        .set({
          accessToken: next.accessToken,
          ...(next.refreshToken != null && { refreshToken: next.refreshToken }),
          ...(next.tokenExpiresAt != null && { tokenExpiresAt: next.tokenExpiresAt }),
          updatedAt: new Date(),
        })
        .where(eq(churchIntegrations.id, integration.id));
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Token refresh failed";
      return { success: false, reason: `Could not refresh ${platform} token. ${msg}` };
    }
  }

  const title = courseName ? `${courseName} – ${className}` : className;

  // For Teams: add class facilitator, optional recurrence (from class), and optional calendar (from integration metadata)
  let facilitatorEmail: string | null = null;
  let meetingRecurrence: { type: "weekly"; daysOfWeek: number[]; endDate: string } | null = null;
  let teamsCalendarId: string | null = null;
  if (platform === "teams") {
    const meta = integration.metadata as { calendarId?: string | null } | null;
    if (meta?.calendarId && String(meta.calendarId).trim()) {
      teamsCalendarId = String(meta.calendarId).trim();
    }
    const classRow = await db.query.classes.findFirst({
      where: and(eq(classes.id, classId), eq(classes.churchId, churchId)),
      columns: { facilitatorId: true, meetingRecurrence: true },
    });
    if (classRow?.facilitatorId) {
      const facilitator = await db.query.users.findFirst({
        where: eq(users.id, classRow.facilitatorId),
        columns: { email: true },
      });
      if (facilitator?.email) facilitatorEmail = facilitator.email;
    }
    const rec = classRow?.meetingRecurrence as { type?: string; daysOfWeek?: number[]; endDate?: string } | null;
    if (rec?.type === "weekly" && Array.isArray(rec.daysOfWeek) && rec.daysOfWeek.length > 0 && rec.endDate) {
      meetingRecurrence = { type: "weekly", daysOfWeek: rec.daysOfWeek, endDate: String(rec.endDate) };
    }
  }

  const doCreate = async (token: string, includeFacilitator = true) =>
    provider.createMeeting(
      {
        classId,
        churchId,
        title,
        startTime,
        durationMinutes,
        timezone,
        ...(includeFacilitator && facilitatorEmail && { facilitatorEmail }),
        ...(meetingRecurrence && { recurrence: meetingRecurrence }),
        ...(teamsCalendarId && { calendarId: teamsCalendarId }),
      },
      token
    );

  function isFacilitatorRelatedError(msg: string): boolean {
    const lower = msg.toLowerCase();
    return (
      lower.includes("user") && (lower.includes("not found") || lower.includes("invalid") || lower.includes("does not exist")) ||
      lower.includes("attendee") ||
      lower.includes("coorganizer") ||
      lower.includes("co-organizer") ||
      lower.includes("cannot add") ||
      lower.includes("was not found")
    );
  }

  try {
    const result = await doCreate(accessToken);
    await db
      .update(classes)
      .set({
        meetingUrl: result.meetingUrl,
        ...(result.meetingId != null && { meetingId: result.meetingId }),
        updatedAt: new Date(),
      })
      .where(and(eq(classes.id, classId), eq(classes.churchId, churchId)));
    return { success: true };
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : String(e);
    const isExpiredAuth =
      errMsg.includes("InvalidAuthenticationToken") ||
      errMsg.includes("Lifetime validation failed") ||
      errMsg.includes("expired") ||
      errMsg.includes("401");

    // Retry without facilitator if they're in the app but not in O365 (Graph rejects co-organizer/attendee)
    if (
      platform === "teams" &&
      facilitatorEmail &&
      !isExpiredAuth &&
      isFacilitatorRelatedError(errMsg)
    ) {
      try {
        const retryResult = await doCreate(accessToken, false);
        await db
          .update(classes)
          .set({
            meetingUrl: retryResult.meetingUrl,
            ...(retryResult.meetingId != null && { meetingId: retryResult.meetingId }),
            updatedAt: new Date(),
          })
          .where(and(eq(classes.id, classId), eq(classes.churchId, churchId)));
        return { success: true };
      } catch {
        // fall through to return original error
      }
    }

    // Retry once after refresh if the failure was due to expired/invalid token
    if (isExpiredAuth && provider.refreshTokens && refreshToken) {
      try {
        const next = await provider.refreshTokens({
          accessToken,
          refreshToken,
          tokenExpiresAt,
        });
        await db
          .update(churchIntegrations)
          .set({
            accessToken: next.accessToken,
            ...(next.refreshToken != null && { refreshToken: next.refreshToken }),
            ...(next.tokenExpiresAt != null && { tokenExpiresAt: next.tokenExpiresAt }),
            updatedAt: new Date(),
          })
          .where(eq(churchIntegrations.id, integration.id));
        const retryResult = await doCreate(next.accessToken);
        await db
          .update(classes)
          .set({
            meetingUrl: retryResult.meetingUrl,
            ...(retryResult.meetingId != null && { meetingId: retryResult.meetingId }),
            updatedAt: new Date(),
          })
          .where(and(eq(classes.id, classId), eq(classes.churchId, churchId)));
        return { success: true };
      } catch (retryErr) {
        const msg = retryErr instanceof Error ? retryErr.message : "Meeting creation failed";
        return { success: false, reason: msg };
      }
    }
    if (isExpiredAuth) {
      return {
        success: false,
        reason:
          "Your connection to this platform has expired. Go to Settings → Integrations and reconnect to create meetings automatically.",
      };
    }
    return { success: false, reason: errMsg };
  }
}

/**
 * Deletes the Teams meeting in Graph (if platform is Teams and we have a meetingId), then clears
 * meetingUrl, meetingId, and meetingRecurrence on the class. For Zoom/Google Meet we only clear DB fields.
 * Returns { success: true } or { success: false, reason }.
 */
export async function deleteClassMeeting(params: { classId: string; churchId: string }): Promise<
  | { success: true }
  | { success: false; reason: string }
> {
  const { classId, churchId } = params;
  const classRow = await db.query.classes.findFirst({
    where: and(eq(classes.id, classId), eq(classes.churchId, churchId)),
    columns: { meetingPlatform: true, meetingId: true, meetingRecurrence: true },
  });
  if (!classRow) {
    return { success: false, reason: "Class not found." };
  }

  if (classRow.meetingPlatform === "teams" && classRow.meetingId && String(classRow.meetingId).trim()) {
    const integration = await db.query.churchIntegrations.findFirst({
      where: and(
        eq(churchIntegrations.churchId, churchId),
        eq(churchIntegrations.platform, "teams"),
        eq(churchIntegrations.isActive, true)
      ),
      columns: { id: true, accessToken: true, refreshToken: true, tokenExpiresAt: true },
    });
    if (integration?.accessToken) {
      let accessToken = integration.accessToken;
      if (teamsProvider.refreshTokens && integration.refreshToken) {
        try {
          const next = await teamsProvider.refreshTokens({
            accessToken: integration.accessToken,
            refreshToken: integration.refreshToken,
            tokenExpiresAt: integration.tokenExpiresAt,
          });
          accessToken = next.accessToken;
          await db
            .update(churchIntegrations)
            .set({
              accessToken: next.accessToken,
              ...(next.refreshToken != null && { refreshToken: next.refreshToken }),
              ...(next.tokenExpiresAt != null && { tokenExpiresAt: next.tokenExpiresAt }),
              updatedAt: new Date(),
            })
            .where(eq(churchIntegrations.id, integration.id));
        } catch {
          // proceed with current token
        }
      }
      const rec = classRow.meetingRecurrence as { type?: string } | null;
      const isRecurring = !!(rec?.type === "weekly");
      try {
        if (isRecurring) {
          await deleteCalendarEvent(String(classRow.meetingId), accessToken);
        } else {
          await deleteOnlineMeeting(String(classRow.meetingId), accessToken);
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return { success: false, reason: `Could not delete Teams meeting: ${msg}` };
      }
    }
    // If no integration or token, we still clear DB fields below
  }

  await db
    .update(classes)
    .set({
      meetingUrl: null,
      meetingId: null,
      meetingRecurrence: null,
      updatedAt: new Date(),
    })
    .where(and(eq(classes.id, classId), eq(classes.churchId, churchId)));
  return { success: true };
}

/**
 * Updates the existing Teams meeting for the class (calendar event or one-time).
 * If update fails (e.g. event gone), deletes the old meeting and creates a new one, then updates the class.
 * Only supports Teams. Returns { success: true } or { success: false, reason }.
 */
export async function updateClassMeeting(params: {
  classId: string;
  churchId: string;
  timezone?: string;
}): Promise<{ success: true } | { success: false; reason: string }> {
  const { classId, churchId, timezone = "UTC" } = params;
  const classRow = await db.query.classes.findFirst({
    where: and(eq(classes.id, classId), eq(classes.churchId, churchId)),
    columns: {
      name: true,
      meetingPlatform: true,
      meetingId: true,
      meetingRecurrence: true,
      meetingScheduledAt: true,
      meetingDurationMinutes: true,
      facilitatorId: true,
      courseId: true,
    },
  });
  if (!classRow) return { success: false, reason: "Class not found." };
  if (classRow.meetingPlatform !== "teams") {
    return { success: false, reason: "Only Teams meetings can be updated. Use Generate meeting link for other platforms." };
  }
  if (!classRow.meetingId || !String(classRow.meetingId).trim()) {
    return { success: false, reason: "No existing meeting to update. Use Generate meeting link first." };
  }
  if (!classRow.meetingScheduledAt) {
    return { success: false, reason: "Set meeting date & time and save first." };
  }

  const integration = await db.query.churchIntegrations.findFirst({
    where: and(
      eq(churchIntegrations.churchId, churchId),
      eq(churchIntegrations.platform, "teams"),
      eq(churchIntegrations.isActive, true)
    ),
    columns: { id: true, accessToken: true, refreshToken: true, tokenExpiresAt: true, metadata: true },
  });
  if (!integration?.accessToken) {
    return { success: false, reason: "Connect Teams in Settings → Integrations." };
  }

  let accessToken = integration.accessToken;
  if (teamsProvider.refreshTokens && integration.refreshToken) {
    try {
      const next = await teamsProvider.refreshTokens({
        accessToken: integration.accessToken,
        refreshToken: integration.refreshToken,
        tokenExpiresAt: integration.tokenExpiresAt,
      });
      accessToken = next.accessToken;
      await db
        .update(churchIntegrations)
        .set({
          accessToken: next.accessToken,
          ...(next.refreshToken != null && { refreshToken: next.refreshToken }),
          ...(next.tokenExpiresAt != null && { tokenExpiresAt: next.tokenExpiresAt }),
          updatedAt: new Date(),
        })
        .where(eq(churchIntegrations.id, integration.id));
    } catch {
      // use current token
    }
  }

  const meta = integration.metadata as { calendarId?: string | null } | null;
  const calendarId = meta?.calendarId && String(meta.calendarId).trim() ? String(meta.calendarId).trim() : null;
  const course = await db.query.courses.findFirst({
    where: eq(courses.id, classRow.courseId),
    columns: { name: true },
  });
  const courseName = course?.name;
  const title = courseName ? `${courseName} – ${classRow.name}` : classRow.name;
  let facilitatorEmail: string | null = null;
  if (classRow.facilitatorId) {
    const fac = await db.query.users.findFirst({
      where: eq(users.id, classRow.facilitatorId),
      columns: { email: true },
    });
    if (fac?.email) facilitatorEmail = fac.email;
  }
  const startTime = classRow.meetingScheduledAt instanceof Date ? classRow.meetingScheduledAt : new Date(classRow.meetingScheduledAt);
  const durationMinutes = classRow.meetingDurationMinutes ?? 60;
  const endTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000);
  const rec = classRow.meetingRecurrence as { type?: string; daysOfWeek?: number[]; endDate?: string } | null;
  const isRecurring = !!(rec?.type === "weekly" && Array.isArray(rec.daysOfWeek) && rec.daysOfWeek.length > 0 && rec.endDate);
  const meetingRecurrence = isRecurring
    ? { type: "weekly" as const, daysOfWeek: rec!.daysOfWeek!, endDate: String(rec!.endDate) }
    : null;

  const meetingId = String(classRow.meetingId);

  function isFacilitatorRelatedError(msg: string): boolean {
    const lower = msg.toLowerCase();
    return (
      (lower.includes("user") && (lower.includes("not found") || lower.includes("invalid") || lower.includes("does not exist"))) ||
      lower.includes("attendee") ||
      lower.includes("coorganizer") ||
      lower.includes("co-organizer") ||
      lower.includes("cannot add") ||
      lower.includes("was not found")
    );
  }

  if (isRecurring) {
    const tryUpdate = (withFacilitator: boolean) =>
      updateCalendarEvent(
        meetingId,
        title,
        startTime,
        endTime,
        meetingRecurrence!,
        timezone,
        accessToken,
        withFacilitator ? facilitatorEmail : undefined
      );
    const tryCreateRecurring = (withFacilitator: boolean) =>
      createRecurringMeeting(
        classId,
        title,
        startTime,
        endTime,
        meetingRecurrence!,
        timezone,
        accessToken,
        withFacilitator ? facilitatorEmail ?? undefined : undefined,
        calendarId
      );
    try {
      const result = await tryUpdate(!!facilitatorEmail);
      await db
        .update(classes)
        .set({ meetingUrl: result.meetingUrl, updatedAt: new Date() })
        .where(and(eq(classes.id, classId), eq(classes.churchId, churchId)));
      return { success: true };
    } catch (e) {
      if (facilitatorEmail && isFacilitatorRelatedError(e instanceof Error ? e.message : String(e))) {
        try {
          const result = await tryUpdate(false);
          await db
            .update(classes)
            .set({ meetingUrl: result.meetingUrl, updatedAt: new Date() })
            .where(and(eq(classes.id, classId), eq(classes.churchId, churchId)));
          return { success: true };
        } catch {
          // fall through to delete + create
        }
      }
      try {
        await deleteCalendarEvent(meetingId, accessToken);
      } catch {
        // ignore
      }
      try {
        const result = await tryCreateRecurring(!!facilitatorEmail);
        await db
          .update(classes)
          .set({
            meetingUrl: result.meetingUrl,
            meetingId: result.meetingId,
            updatedAt: new Date(),
          })
          .where(and(eq(classes.id, classId), eq(classes.churchId, churchId)));
        return { success: true };
      } catch (createErr) {
        if (facilitatorEmail && isFacilitatorRelatedError(createErr instanceof Error ? createErr.message : String(createErr))) {
          try {
            const result = await tryCreateRecurring(false);
            await db
              .update(classes)
              .set({
                meetingUrl: result.meetingUrl,
                meetingId: result.meetingId,
                updatedAt: new Date(),
              })
              .where(and(eq(classes.id, classId), eq(classes.churchId, churchId)));
            return { success: true };
          } catch {
            // fall through to return error
          }
        }
        return { success: false, reason: createErr instanceof Error ? createErr.message : String(createErr) };
      }
    }
  }

  try {
    await deleteOnlineMeeting(meetingId, accessToken);
  } catch {
    // ignore
  }
  try {
    const result = await createMeeting(
      classId,
      title,
      startTime,
      endTime,
      accessToken,
      facilitatorEmail ?? undefined
    );
    await db
      .update(classes)
      .set({
        meetingUrl: result.meetingUrl,
        meetingId: result.meetingId,
        updatedAt: new Date(),
      })
      .where(and(eq(classes.id, classId), eq(classes.churchId, churchId)));
    return { success: true };
  } catch (e) {
    if (facilitatorEmail && isFacilitatorRelatedError(e instanceof Error ? e.message : String(e))) {
      try {
        const result = await createMeeting(
          classId,
          title,
          startTime,
          endTime,
          accessToken,
          undefined
        );
        await db
          .update(classes)
          .set({
            meetingUrl: result.meetingUrl,
            meetingId: result.meetingId,
            updatedAt: new Date(),
          })
          .where(and(eq(classes.id, classId), eq(classes.churchId, churchId)));
        return { success: true };
      } catch {
        // fall through
      }
    }
    return { success: false, reason: e instanceof Error ? e.message : String(e) };
  }
}
