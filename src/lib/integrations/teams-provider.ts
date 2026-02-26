/**
 * Microsoft Teams meeting provider. Uses existing createMeeting from teams.ts.
 * Token refresh: Microsoft OAuth2 refresh_token grant.
 */
import type { MeetingProvider, TokenSet, CreateMeetingInput, CreateMeetingResult } from "./types";
import { createMeeting as teamsCreateMeeting, createRecurringMeeting } from "./teams";

const MS_TOKEN_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/token";

async function refreshTeamsTokens(current: TokenSet): Promise<TokenSet> {
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
  if (!clientId || !clientSecret || !current.refreshToken) {
    throw new Error("Teams refresh not configured or no refresh token");
  }
  const res = await fetch(MS_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: current.refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || "Teams token refresh failed");
  }
  const data = (await res.json()) as { access_token: string; refresh_token?: string; expires_in?: number };
  const tokenExpiresAt = data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : null;
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? current.refreshToken,
    tokenExpiresAt,
  };
}

export const teamsProvider: MeetingProvider = {
  platform: "teams",
  async createMeeting(input: CreateMeetingInput, accessToken: string): Promise<CreateMeetingResult> {
    const endTime = new Date(input.startTime.getTime() + input.durationMinutes * 60 * 1000);
    if (input.recurrence?.type === "weekly" && input.recurrence.daysOfWeek?.length > 0 && input.recurrence.endDate) {
      const result = await createRecurringMeeting(
        input.classId,
        input.title,
        input.startTime,
        endTime,
        {
          type: "weekly",
          daysOfWeek: input.recurrence.daysOfWeek,
          endDate: input.recurrence.endDate,
        },
        input.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
        accessToken,
        input.facilitatorEmail ?? undefined,
        input.calendarId ?? undefined
      );
      return { meetingUrl: result.meetingUrl, meetingId: result.meetingId ?? null };
    }
    const result = await teamsCreateMeeting(
      input.classId,
      input.title,
      input.startTime,
      endTime,
      accessToken,
      input.facilitatorEmail ?? undefined
    );
    return { meetingUrl: result.meetingUrl, meetingId: result.meetingId ?? null };
  },
  refreshTokens: refreshTeamsTokens,
};
