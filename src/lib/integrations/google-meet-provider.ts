/**
 * Google Meet (Calendar API) provider. Uses existing createMeeting from google-meet.ts.
 * Token refresh: Google OAuth2 refresh_token grant.
 */
import type { MeetingProvider, TokenSet, CreateMeetingInput, CreateMeetingResult } from "./types";
import { createMeeting as googleCreateMeeting } from "./google-meet";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

async function refreshGoogleTokens(current: TokenSet): Promise<TokenSet> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret || !current.refreshToken) {
    throw new Error("Google refresh not configured or no refresh token");
  }
  const res = await fetch(GOOGLE_TOKEN_URL, {
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
    throw new Error(err || "Google token refresh failed");
  }
  const data = (await res.json()) as { access_token: string; expires_in?: number };
  const tokenExpiresAt = data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : null;
  return {
    accessToken: data.access_token,
    refreshToken: current.refreshToken,
    tokenExpiresAt,
  };
}

export const googleMeetProvider: MeetingProvider = {
  platform: "google_meet",
  async createMeeting(input: CreateMeetingInput, accessToken: string): Promise<CreateMeetingResult> {
    const endTime = new Date(input.startTime.getTime() + input.durationMinutes * 60 * 1000);
    const result = await googleCreateMeeting(
      input.classId,
      input.title,
      input.startTime,
      endTime,
      accessToken
    );
    return { meetingUrl: result.meetingUrl };
  },
  refreshTokens: refreshGoogleTokens,
};
