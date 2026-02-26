const DAYS_OF_WEEK = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const;

/** Format a Date as local time in the given IANA timezone for Graph API (yyyy-MM-ddTHH:mm:ss). */
function formatInTimeZone(date: Date, timeZone: string): string {
  const s = date.toLocaleString("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  return s.replace(", ", "T");
}

function graphErrorReason(res: Response, bodyText: string): string {
  try {
    const json = JSON.parse(bodyText) as { error?: { code?: string; message?: string } };
    const code = json.error?.code;
    const message = json.error?.message ?? bodyText;
    if (code === "ErrorAccessDenied") {
      return "Teams access was denied. Go to Settings → Integrations, disconnect Teams, then connect again so the app can request calendar permission. If you use recurring meetings, your Microsoft 365 admin may need to grant consent for Calendars.ReadWrite.";
    }
    return message;
  } catch {
    return bodyText || "Graph API error";
  }
}

/** Recurrence for Teams: weekly on given days (0=Sun..6=Sat) until endDate (YYYY-MM-DD). */
export interface TeamsRecurrence {
  type: "weekly";
  daysOfWeek: number[];
  endDate: string;
}

/**
 * Microsoft Teams / Graph API meeting creation (one-time).
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
): Promise<{ meetingUrl: string; meetingId: string }> {
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
    throw new Error(graphErrorReason(res, err));
  }
  const data = (await res.json()) as {
    id?: string;
    joinWebUrl?: string;
    joinUrl?: string;
    joinInformation?: { content?: string; contentFormat?: string };
  };
  const url = data.joinWebUrl ?? data.joinUrl;
  if (url && typeof url === "string" && url.trim().length > 0) {
    return { meetingUrl: url.trim(), meetingId: data.id ?? "" };
  }
  throw new Error("Teams API did not return a join URL (joinWebUrl). Check Graph API permissions and response.");
}

/**
 * Create a recurring Teams meeting via calendar events (supports recurrence).
 * Uses POST /me/calendar/events (or /me/calendars/{calendarId}/events if calendarId set).
 * Requires Calendars.ReadWrite scope.
 */
export async function createRecurringMeeting(
  _classId: string,
  subject: string,
  startTime: Date,
  endTime: Date,
  recurrence: TeamsRecurrence,
  timezone: string,
  accessToken: string,
  facilitatorUpn?: string | null,
  calendarId?: string | null
): Promise<{ meetingUrl: string; meetingId: string }> {
  const daysOfWeek = recurrence.daysOfWeek
    .filter((d) => d >= 0 && d <= 6)
    .map((d) => DAYS_OF_WEEK[d]);
  if (daysOfWeek.length === 0) {
    throw new Error("Recurrence must include at least one day of the week.");
  }
  const startDate = formatInTimeZone(startTime, timezone).slice(0, 10);
  const body = {
    subject,
    start: {
      dateTime: formatInTimeZone(startTime, timezone),
      timeZone: timezone,
    },
    end: {
      dateTime: formatInTimeZone(endTime, timezone),
      timeZone: timezone,
    },
    isOnlineMeeting: true,
    onlineMeetingProvider: "teamsForBusiness",
    recurrence: {
      pattern: {
        type: "weekly",
        interval: 1,
        daysOfWeek,
      },
      range: {
        type: "endDate",
        startDate,
        endDate: recurrence.endDate,
      },
    },
    ...(facilitatorUpn?.trim() && {
      attendees: [
        {
          emailAddress: { address: facilitatorUpn.trim(), name: "Facilitator" },
          type: "optional",
        },
      ],
    }),
  };
  const eventsUrl =
    calendarId && calendarId.trim()
      ? `https://graph.microsoft.com/v1.0/me/calendars/${encodeURIComponent(calendarId.trim())}/events`
      : "https://graph.microsoft.com/v1.0/me/calendar/events";
  const res = await fetch(eventsUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(graphErrorReason(res, err));
  }
  const data = (await res.json()) as {
    id?: string;
    onlineMeeting?: { joinUrl?: string };
    webLink?: string;
  };
  const url = data.onlineMeeting?.joinUrl;
  if (url && typeof url === "string" && url.trim().length > 0) {
    return { meetingUrl: url.trim(), meetingId: data.id ?? "" };
  }
  throw new Error("Graph API did not return an online meeting join URL. Check Calendars.ReadWrite and response.");
}

/**
 * Delete a one-time Teams online meeting. Requires OnlineMeetings.ReadWrite.
 * meetingId is the id returned when creating via POST /me/onlineMeetings.
 */
export async function deleteOnlineMeeting(meetingId: string, accessToken: string): Promise<void> {
  if (!meetingId.trim()) return;
  const res = await fetch(`https://graph.microsoft.com/v1.0/me/onlineMeetings/${encodeURIComponent(meetingId)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok && res.status !== 404) {
    const err = await res.text();
    throw new Error(graphErrorReason(res, err));
  }
}

/**
 * Delete a calendar event (e.g. recurring Teams meeting series). Requires Calendars.ReadWrite.
 * eventId is the id returned when creating via POST /me/calendar/events.
 */
export async function deleteCalendarEvent(eventId: string, accessToken: string): Promise<void> {
  if (!eventId.trim()) return;
  const res = await fetch(`https://graph.microsoft.com/v1.0/me/events/${encodeURIComponent(eventId)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok && res.status !== 404) {
    const err = await res.text();
    throw new Error(graphErrorReason(res, err));
  }
}

/**
 * Update an existing calendar event (recurring Teams meeting). Uses PATCH /me/events/{id}.
 * If the update fails (e.g. 404), the caller should delete and recreate.
 */
export async function updateCalendarEvent(
  eventId: string,
  subject: string,
  startTime: Date,
  endTime: Date,
  recurrence: TeamsRecurrence,
  timezone: string,
  accessToken: string,
  facilitatorUpn?: string | null
): Promise<{ meetingUrl: string }> {
  if (!eventId.trim()) throw new Error("Event id required");
  const daysOfWeek = recurrence.daysOfWeek
    .filter((d) => d >= 0 && d <= 6)
    .map((d) => DAYS_OF_WEEK[d]);
  if (daysOfWeek.length === 0) throw new Error("Recurrence must include at least one day of the week.");
  const startDate = formatInTimeZone(startTime, timezone).slice(0, 10);
  const body = {
    subject,
    start: {
      dateTime: formatInTimeZone(startTime, timezone),
      timeZone: timezone,
    },
    end: {
      dateTime: formatInTimeZone(endTime, timezone),
      timeZone: timezone,
    },
    recurrence: {
      pattern: { type: "weekly" as const, interval: 1, daysOfWeek },
      range: { type: "endDate" as const, startDate, endDate: recurrence.endDate },
    },
    ...(facilitatorUpn?.trim() && {
      attendees: [
        {
          emailAddress: { address: facilitatorUpn.trim(), name: "Facilitator" },
          type: "optional" as const,
        },
      ],
    }),
  };
  const res = await fetch(`https://graph.microsoft.com/v1.0/me/events/${encodeURIComponent(eventId)}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(graphErrorReason(res, err));
  }
  const data = (await res.json()) as { onlineMeeting?: { joinUrl?: string } };
  const url = data.onlineMeeting?.joinUrl;
  if (url && typeof url === "string" && url.trim().length > 0) {
    return { meetingUrl: url.trim() };
  }
  throw new Error("Graph API did not return an online meeting join URL after update.");
}
