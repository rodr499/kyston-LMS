import { randomUUID } from "crypto";

/**
 * Google Meet via Calendar API.
 * Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET. Use /api/integrations/google-meet/connect for OAuth.
 */
export async function createMeeting(
  _classId: string,
  summary: string,
  startTime: Date,
  endTime: Date,
  accessToken: string
): Promise<{ meetingUrl: string }> {
  const res = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      summary,
      start: { dateTime: startTime.toISOString(), timeZone: "UTC" },
      end: { dateTime: endTime.toISOString(), timeZone: "UTC" },
      conferenceData: {
        createRequest: {
          requestId: `kyston-${randomUUID()}`,
          conferenceSolutionKey: { type: "hangoutsMeet" },
        },
      },
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    console.error("[google-meet] createMeeting failed:", err);
    throw new Error("Failed to create Google Meet meeting");
  }
  const data = (await res.json()) as { hangoutLink?: string };
  return { meetingUrl: data.hangoutLink ?? "" };
}
