"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import DOMPurify from "dompurify";

type Activity = {
  id: string;
  title: string;
  type: string;
  content: Record<string, unknown> | null;
  isRequired: boolean;
  points: number;
};

type Completion = {
  id: string;
  status: string;
  responseData: Record<string, unknown> | null;
} | null;

// Type guards for activity content shapes
function isArticleContent(c: unknown): c is { html: string } {
  return typeof c === "object" && c !== null && "html" in c && typeof (c as Record<string, unknown>).html === "string";
}
function isAcknowledgmentContent(c: unknown): c is { statement: string } {
  return typeof c === "object" && c !== null && "statement" in c && typeof (c as Record<string, unknown>).statement === "string";
}
function isVideoContent(c: unknown): c is { url: string } {
  return typeof c === "object" && c !== null && "url" in c && typeof (c as Record<string, unknown>).url === "string";
}

const ALLOWED_VIDEO_HOSTS = ["youtube.com", "youtu.be", "vimeo.com", "loom.com"];

export default function ActivityView({
  activity,
  completion,
  churchId,
  studentId,
}: {
  activity: Activity;
  completion: Completion;
  churchId: string;
  studentId: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const isCompleted = completion?.status === "completed";

  async function markComplete() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/activity-complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          churchId,
          activityId: activity.id,
          studentId,
          status: "completed",
          responseData: {},
        }),
      });
      if (!res.ok) {
        let msg = "Failed to save progress";
        try {
          const d = await res.json();
          if (d.error) msg = d.error;
        } catch {}
        setError(msg);
        return;
      }
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // Validate video URL is from an allowed host
  function isSafeVideoUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      return ALLOWED_VIDEO_HOSTS.some((h) => parsed.hostname === h || parsed.hostname.endsWith(`.${h}`));
    } catch {
      return false;
    }
  }

  return (
    <div className="card bg-white shadow-sm rounded-2xl border border-[#e5e7eb]">
      <div className="card-body gap-4">
        <h1 className="font-heading text-2xl font-bold">{activity.title}</h1>
        <p className="font-body text-sm text-base-content/70">Type: {activity.type} • Points: {activity.points}</p>
        {activity.type === "content_article" && activity.content && isArticleContent(activity.content) && (
          <div
            className="prose prose-neutral max-w-none mt-2 font-body"
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(activity.content.html) }}
          />
        )}
        {activity.type === "acknowledgment" && (
          <div className="mt-2">
            <p className="font-body">
              {isAcknowledgmentContent(activity.content) ? activity.content.statement : "I acknowledge the above."}
            </p>
            {!isCompleted && (
              <button onClick={markComplete} className="btn btn-primary rounded-xl font-body mt-4" disabled={loading}>
                {loading ? "Saving…" : "I acknowledge"}
              </button>
            )}
          </div>
        )}
        {activity.type === "video_watch" && (
          <div className="mt-2">
            {isVideoContent(activity.content) && isSafeVideoUrl(activity.content.url) && (
              <iframe
                src={activity.content.url}
                title={activity.title}
                className="w-full aspect-video rounded-xl"
                allowFullScreen
              />
            )}
            {!isCompleted && (
              <button onClick={markComplete} className="btn btn-primary rounded-xl font-body mt-4" disabled={loading}>
                {loading ? "Saving…" : "Mark as complete"}
              </button>
            )}
          </div>
        )}
        {!["content_article", "acknowledgment", "video_watch"].includes(activity.type) && (
          <p className="mt-2 font-body text-base-content/70">Activity type &quot;{activity.type}&quot; — submit via form or mark complete when done.</p>
        )}
        {error && <p className="mt-2 text-error font-body text-sm">{error}</p>}
        {isCompleted && (
          <p className="mt-4 text-success font-body font-medium">Completed</p>
        )}
      </div>
    </div>
  );
}
