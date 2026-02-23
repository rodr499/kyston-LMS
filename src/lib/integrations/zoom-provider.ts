/**
 * Zoom meeting provider. Uses existing createMeeting from zoom.ts.
 * Token refresh: Zoom OAuth refresh_token grant.
 */
import type { MeetingProvider, TokenSet, CreateMeetingInput, CreateMeetingResult } from "./types";
import { createMeeting as zoomCreateMeeting } from "./zoom";

const ZOOM_TOKEN_URL = "https://zoom.us/oauth/token";

async function refreshZoomTokens(current: TokenSet): Promise<TokenSet> {
  const clientId = process.env.ZOOM_CLIENT_ID;
  const clientSecret = process.env.ZOOM_CLIENT_SECRET;
  if (!clientId || !clientSecret || !current.refreshToken) {
    throw new Error("Zoom refresh not configured or no refresh token");
  }
  const res = await fetch(ZOOM_TOKEN_URL, {
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
    throw new Error(err || "Zoom token refresh failed");
  }
  const data = (await res.json()) as { access_token: string; refresh_token?: string; expires_in?: number };
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? current.refreshToken,
    tokenExpiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : null,
  };
}

export const zoomProvider: MeetingProvider = {
  platform: "zoom",
  async createMeeting(input: CreateMeetingInput, accessToken: string): Promise<CreateMeetingResult> {
    const result = await zoomCreateMeeting(
      input.classId,
      input.title,
      input.startTime,
      input.durationMinutes,
      accessToken
    );
    return { meetingUrl: result.meetingUrl, meetingId: result.meetingId };
  },
  refreshTokens: refreshZoomTokens,
};
