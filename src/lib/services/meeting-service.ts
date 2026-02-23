/**
 * Orchestrates auto-creation of Zoom / Teams / Google Meet meetings when a class is saved.
 * Resolves plan limits, loads/refreshes OAuth tokens, calls the platform API, and updates the class.
 */
import { db } from "@/lib/db";
import { churchIntegrations, classes, users } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { getTenantLimits } from "@/lib/tenant-config";
import { getMeetingProvider } from "@/lib/integrations";
import type { MeetingPlatform } from "@/lib/integrations";

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

  // For Teams: add class facilitator as co-organizer (look up by class)
  let facilitatorEmail: string | null = null;
  if (platform === "teams") {
    const classRow = await db.query.classes.findFirst({
      where: and(eq(classes.id, classId), eq(classes.churchId, churchId)),
      columns: { facilitatorId: true },
    });
    if (classRow?.facilitatorId) {
      const facilitator = await db.query.users.findFirst({
        where: eq(users.id, classRow.facilitatorId),
        columns: { email: true },
      });
      if (facilitator?.email) facilitatorEmail = facilitator.email;
    }
  }

  const doCreate = async (token: string) =>
    provider.createMeeting(
      {
        classId,
        churchId,
        title,
        startTime,
        durationMinutes,
        timezone,
        ...(facilitatorEmail && { facilitatorEmail }),
      },
      token
    );

  try {
    let result = await doCreate(accessToken);
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
