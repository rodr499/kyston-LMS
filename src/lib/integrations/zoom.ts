/**
 * Zoom OAuth and meeting creation.
 * Set ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET. Use /api/integrations/zoom/connect for OAuth.
 */
export async function createMeeting(
  _classId: string,
  topic: string,
  startTime: Date,
  durationMinutes: number,
  accessToken: string
): Promise<{ meetingUrl: string; meetingId: string }> {
  const res = await fetch("https://api.zoom.us/v2/users/me/meetings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      topic,
      type: 2,
      start_time: startTime.toISOString(),
      duration: durationMinutes,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || "Zoom API error");
  }
  const data = (await res.json()) as { join_url: string; id: string };
  return { meetingUrl: data.join_url, meetingId: String(data.id) };
}

export async function getMeetingAttendance(
  _meetingId: string,
  _accessToken: string
): Promise<{ userId: string; name?: string }[]> {
  return [];
}
