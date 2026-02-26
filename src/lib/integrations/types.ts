/**
 * Shared types for meeting providers (Zoom, Teams, Google Meet).
 */

export type MeetingPlatform = "zoom" | "teams" | "google_meet";

export interface TokenSet {
  accessToken: string;
  refreshToken?: string | null;
  tokenExpiresAt?: Date | null;
}

/** Weekly recurrence: days 0=Sun..6=Sat, endDate YYYY-MM-DD. Used for Teams recurring calendar events. */
export interface MeetingRecurrence {
  type: "weekly";
  daysOfWeek: number[];
  endDate: string;
}

export interface CreateMeetingInput {
  classId: string;
  churchId: string;
  title: string;
  startTime: Date;
  durationMinutes: number;
  timezone?: string;
  /** Facilitator email (UPN) for Teams: added as co-organizer when present. */
  facilitatorEmail?: string | null;
  /** When set, Teams creates a recurring calendar event instead of one-time online meeting. */
  recurrence?: MeetingRecurrence | null;
  /** When set, Teams recurring events are created in this calendar (Graph calendar id). */
  calendarId?: string | null;
}

export interface CreateMeetingResult {
  meetingUrl: string;
  meetingId?: string | null;
}

/**
 * Interface implemented by each platform provider.
 * createMeeting uses the given access token; the service layer handles refresh.
 */
export interface MeetingProvider {
  platform: MeetingPlatform;
  createMeeting(
    input: CreateMeetingInput,
    accessToken: string
  ): Promise<CreateMeetingResult>;

  /**
   * Exchange refresh_token for new access token. Optional if platform uses long-lived tokens.
   */
  refreshTokens?(current: TokenSet): Promise<TokenSet>;
}
