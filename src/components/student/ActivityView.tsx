"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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
  const router = useRouter();
  const isCompleted = completion?.status === "completed";

  async function markComplete() {
    setLoading(true);
    try {
      await fetch("/api/activity-complete", {
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
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card bg-white shadow-sm rounded-2xl border border-[#e5e7eb]">
      <div className="card-body gap-4">
        <h1 className="font-heading text-2xl font-bold">{activity.title}</h1>
        <p className="font-body text-sm text-base-content/70">Type: {activity.type} • Points: {activity.points}</p>
        {activity.type === "content_article" && activity.content && (
          <div className="prose prose-neutral max-w-none mt-2 font-body" dangerouslySetInnerHTML={{ __html: (activity.content as { html?: string }).html ?? String(activity.content) }} />
        )}
        {activity.type === "acknowledgment" && (
          <div className="mt-2">
            <p className="font-body">{(activity.content as { statement?: string })?.statement ?? "I acknowledge the above."}</p>
            {!isCompleted && (
              <button onClick={markComplete} className="btn btn-primary rounded-xl font-body mt-4" disabled={loading}>
                {loading ? "Saving…" : "I acknowledge"}
              </button>
            )}
          </div>
        )}
        {activity.type === "video_watch" && (
          <div className="mt-2">
            {activity.content && (activity.content as { url?: string }).url && (
              <iframe
                src={(activity.content as { url: string }).url}
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
        {isCompleted && (
          <p className="mt-4 text-success font-body font-medium">Completed</p>
        )}
      </div>
    </div>
  );
}
