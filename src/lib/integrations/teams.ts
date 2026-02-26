/**
 * Microsoft Teams / Graph API meeting creation.
 * Set MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET. Use /api/integrations/teams/connect for OAuth.
 * When facilitatorUpn is provided, that user is added as co-organizer (must be in same Entra tenant).
 */
export async function createMeeting(
  _classId: string,
  subject: string,
  startTime: Date,
  endTime: Date,
  accessToken: string,
  facilitatorUpn?: string | null
): Promise<{ meetingUrl: string }> {
  const body: {
    startDateTime: string;
    endDateTime: string;
    subject: string;
    participants?: {
      attendees?: { upn: string; role: string }[];
    };
  } = {
    startDateTime: startTime.toISOString(),
    endDateTime: endTime.toISOString(),
    subject,
  };
  if (facilitatorUpn?.trim()) {
    body.participants = {
      attendees: [{ upn: facilitatorUpn.trim(), role: "coorganizer" }],
    };
  }
  const res = await fetch("https://graph.microsoft.com/v1.0/me/onlineMeetings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    console.error("[teams] createMeeting failed:", err);
    throw new Error("Failed to create Teams meeting");
  }
  const data = (await res.json()) as { joinWebUrl?: string; joinUrl?: string };
  return { meetingUrl: data.joinWebUrl ?? data.joinUrl ?? "" };
}
