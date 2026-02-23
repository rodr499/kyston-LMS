/**
 * Meeting provider registry. Use getMeetingProvider(platform) for auto-creation.
 */
import type { MeetingPlatform, MeetingProvider } from "./types";
import { zoomProvider } from "./zoom-provider";
import { teamsProvider } from "./teams-provider";
import { googleMeetProvider } from "./google-meet-provider";

const providers: Record<MeetingPlatform, MeetingProvider> = {
  zoom: zoomProvider,
  teams: teamsProvider,
  google_meet: googleMeetProvider,
};

export function getMeetingProvider(platform: MeetingPlatform): MeetingProvider {
  const p = providers[platform];
  if (!p) throw new Error(`Unknown meeting platform: ${platform}`);
  return p;
}

export type { MeetingPlatform, MeetingProvider, TokenSet, CreateMeetingInput, CreateMeetingResult } from "./types";
