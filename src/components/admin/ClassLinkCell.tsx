"use client";

import { useState } from "react";
import { Link2, Copy, Check, Video } from "lucide-react";

type Props = {
  classId?: string;
  baseUrl?: string;
  meetingUrl?: string | null;
  meetingPlatform?: string | null;
};

const PLATFORM_LABELS: Record<string, string> = {
  teams: "Teams",
  zoom: "Zoom",
  google_meet: "Google Meet",
};

export default function ClassLinkCell({ classId, baseUrl, meetingUrl, meetingPlatform }: Props) {
  const [copied, setCopied] = useState(false);
  const [copiedMeeting, setCopiedMeeting] = useState(false);
  const classUrl = baseUrl && classId ? `${baseUrl}/learn/classes/${classId}` : "";
  const platformLabel =
    meetingPlatform && meetingPlatform !== "none"
      ? PLATFORM_LABELS[meetingPlatform] ?? "Meeting"
      : "Meeting";

  async function copyClassLink() {
    if (!classUrl) return;
    try {
      await navigator.clipboard.writeText(classUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }

  async function copyMeetingLink() {
    if (!meetingUrl) return;
    try {
      await navigator.clipboard.writeText(meetingUrl);
      setCopiedMeeting(true);
      setTimeout(() => setCopiedMeeting(false), 2000);
    } catch {
      // ignore
    }
  }

  const showClassLink = !!classUrl;
  const showMeetingLink = !!meetingUrl;

  if (!showClassLink && !showMeetingLink) {
    return <span className="font-body text-base-content/50 text-xs">—</span>;
  }

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {showClassLink && (
        <>
          <a
            href={classUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-ghost btn-xs rounded-lg font-body gap-1 text-primary"
          >
            <Link2 className="w-3.5 h-3.5" />
            Open
          </a>
          <button
            type="button"
            onClick={copyClassLink}
            className="btn btn-ghost btn-xs rounded-lg font-body gap-1"
            title="Copy class link"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </>
      )}
      {showMeetingLink && (
        <>
          <a
            href={meetingUrl!}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary btn-xs rounded-lg font-body gap-1"
          >
            <Video className="w-3.5 h-3.5" />
            {platformLabel}
          </a>
          <button
            type="button"
            onClick={copyMeetingLink}
            className="btn btn-ghost btn-xs rounded-lg font-body gap-1"
            title="Copy meeting link"
          >
            {copiedMeeting ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </>
      )}
    </div>
  );
}
