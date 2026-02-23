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
          requestId: `kyston-${Date.now()}`,
          conferenceSolutionKey: { type: "hangoutsMeet" },
        },
      },
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || "Calendar API error");
  }
  const data = (await res.json()) as { hangoutLink?: string };
  return { meetingUrl: data.hangoutLink ?? "" };
}
