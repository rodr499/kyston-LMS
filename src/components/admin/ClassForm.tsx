"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { checkMeetingEligibilityAction, createClassMeetingAction } from "@/lib/actions/class-meeting-actions";
import type { MeetingEligibilityMode } from "@/lib/actions/class-meeting-actions";

type Facilitator = { id: string; fullName: string };

function toDatetimeLocal(d: Date | null): string {
  if (!d) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  const y = d.getFullYear();
  const m = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const h = pad(d.getHours());
  const min = pad(d.getMinutes());
  return `${y}-${m}-${day}T${h}:${min}`;
}

export default function ClassForm({
  churchId,
  programId,
  courseId,
  courseName = "",
  facilitators,
  initial = null,
}: {
  churchId: string;
  programId: string;
  courseId: string;
  courseName?: string;
  facilitators: Facilitator[];
  initial?: {
    id: string;
    name: string;
    mode: string;
    gradingSystem: string;
    facilitatorId: string | null;
    allowSelfEnrollment: boolean;
    isPublished: boolean;
    meetingPlatform: string;
    meetingUrl: string | null;
    meetingScheduledAt: Date | null;
  } | null;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [mode, setMode] = useState(initial?.mode ?? "on_demand");
  const [gradingSystem, setGradingSystem] = useState(initial?.gradingSystem ?? "completion");
  const [facilitatorId, setFacilitatorId] = useState(initial?.facilitatorId ?? "");
  const [allowSelfEnrollment, setAllowSelfEnrollment] = useState(initial?.allowSelfEnrollment ?? false);
  const [isPublished, setIsPublished] = useState(initial?.isPublished ?? false);
  const [meetingPlatform, setMeetingPlatform] = useState(initial?.meetingPlatform ?? "none");
  const [meetingUrl, setMeetingUrl] = useState(initial?.meetingUrl ?? "");
  const [meetingScheduledAt, setMeetingScheduledAt] = useState(
    initial?.meetingScheduledAt ? toDatetimeLocal(initial.meetingScheduledAt) : ""
  );
  const [meetingMode, setMeetingMode] = useState<MeetingEligibilityMode>("none");
  const [meetingMessage, setMeetingMessage] = useState<string | null>(null);
  const [meetingError, setMeetingError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitPhase, setSubmitPhase] = useState<"idle" | "saving" | "creating_meeting">("idle");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const MEETING_CREATE_TIMEOUT_MS = 25_000;

  const handlePlatformChange = useCallback(
    async (platform: string) => {
      setMeetingPlatform(platform);
      setMeetingError(null);
      if (platform === "none") {
        setMeetingMode("none");
        setMeetingMessage(null);
        return;
      }
      const result = await checkMeetingEligibilityAction(churchId, platform);
      setMeetingMode(result.mode);
      setMeetingMessage(result.reason ?? null);
    },
    [churchId]
  );

  useEffect(() => {
    if (initial?.meetingPlatform && initial.meetingPlatform !== "none") {
      checkMeetingEligibilityAction(churchId, initial.meetingPlatform)
        .then((result) => {
          setMeetingMode(result.mode);
          setMeetingMessage(result.reason ?? null);
        })
        .catch((err) => {
          console.error("[ClassForm] eligibility check failed:", err);
          setMeetingMode("none");
        });
    }
  }, [churchId, initial?.meetingPlatform]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMeetingError(null);
    setLoading(true);
    setSubmitPhase("saving");
    try {
      const res = await fetch("/api/admin/classes", {
        method: initial ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          churchId,
          courseId,
          name,
          mode,
          gradingSystem,
          facilitatorId: facilitatorId || null,
          allowSelfEnrollment,
          isPublished,
          meetingPlatform,
          meetingUrl: meetingUrl || null,
          meetingScheduledAt: meetingScheduledAt || null,
          ...(initial && { classId: initial.id }),
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Failed");
        setLoading(false);
        setSubmitPhase("idle");
        return;
      }
      const data = (await res.json()) as { id?: string };
      const savedClassId = data.id ?? initial?.id;

      let meetingErrorMsg: string | null = null;
      if (
        meetingPlatform !== "none" &&
        meetingMode === "auto" &&
        meetingScheduledAt &&
        savedClassId
      ) {
        setSubmitPhase("creating_meeting");
        const meetingPromise = createClassMeetingAction({
          classId: savedClassId,
          churchId,
          platform: meetingPlatform as "zoom" | "teams" | "google_meet",
          className: name,
          courseName: courseName || undefined,
          startTime: new Date(meetingScheduledAt),
          durationMinutes: 60,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        });
        const timeoutPromise = new Promise<{ success: false; reason: string }>((_, reject) =>
          setTimeout(() => reject(new Error("timeout")), MEETING_CREATE_TIMEOUT_MS)
        );
        try {
          const meetingResult = await Promise.race([meetingPromise, timeoutPromise]);
          if (!meetingResult.success) {
            meetingErrorMsg = meetingResult.reason ?? "Meeting could not be created. You can add a link manually.";
          }
        } catch (err) {
          meetingErrorMsg =
            err instanceof Error && err.message === "timeout"
              ? "Meeting creation is taking longer than expected. Class saved. You can edit the class to add a meeting link or try again."
              : "Meeting could not be created. You can add a link manually.";
        }
      }

      const listPath = `/admin/programs/${programId}/courses/${courseId}/classes`;
      const url = meetingErrorMsg
        ? `${listPath}?saved=1&meeting_error=${encodeURIComponent(meetingErrorMsg)}`
        : `${listPath}?saved=1`;
      router.push(url);
      router.refresh();
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
      setSubmitPhase("idle");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card bg-white shadow-sm rounded-2xl border border-[#e5e7eb] max-w-2xl">
      <div className="card-body gap-6">
        <h2 className="font-heading text-xl font-bold">{initial ? "Edit class" : "Create New Class"}</h2>
        <div className="form-control w-full">
          <label className="label">
            <span className="label-text font-body font-medium text-base-content">Class name</span>
          </label>
          <input
            type="text"
            placeholder="e.g. Fall 2025 Cohort"
            className="input input-bordered rounded-lg w-full font-body placeholder-[#9ca3af] text-[#111827] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div className="form-control w-full">
          <label className="label">
            <span className="label-text font-body font-medium text-base-content">Mode</span>
          </label>
          <select
            className="select select-bordered rounded-lg font-body w-full text-[#111827] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
            value={mode}
            onChange={(e) => setMode(e.target.value)}
          >
            <option value="on_demand">On-demand</option>
            <option value="academic">Academic</option>
          </select>
        </div>
        <div className="form-control w-full">
          <label className="label">
            <span className="label-text font-body font-medium text-base-content">Grading</span>
          </label>
          <select
            className="select select-bordered rounded-lg font-body w-full text-[#111827] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
            value={gradingSystem}
            onChange={(e) => setGradingSystem(e.target.value)}
          >
            <option value="completion">Completion</option>
            <option value="pass_fail">Pass/Fail</option>
            <option value="letter_grade">Letter grade</option>
          </select>
        </div>
        <div className="form-control w-full">
          <label className="label">
            <span className="label-text font-body font-medium text-base-content">Facilitator</span>
          </label>
          <select
            className="select select-bordered rounded-lg font-body w-full text-[#111827] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
            value={facilitatorId}
            onChange={(e) => setFacilitatorId(e.target.value)}
          >
            <option value="">—</option>
            {facilitators.map((f) => (
              <option key={f.id} value={f.id}>{f.fullName}</option>
            ))}
          </select>
        </div>
        <div className="form-control w-full">
          <label className="label">
            <span className="label-text font-body font-medium text-base-content">Meeting platform</span>
          </label>
          <select
            className="select select-bordered rounded-lg font-body w-full text-[#111827] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
            value={meetingPlatform}
            onChange={(e) => handlePlatformChange(e.target.value)}
          >
            <option value="none">None</option>
            <option value="zoom">Zoom</option>
            <option value="teams">Teams</option>
            <option value="google_meet">Google Meet</option>
          </select>
        </div>
        {meetingPlatform !== "none" && (
          <>
            <div className="form-control w-full">
              <label className="label">
                <span className="label-text font-body font-medium text-base-content">Meeting Date & Time</span>
              </label>
              <input
                type="datetime-local"
                className="input input-bordered rounded-lg w-full font-body text-[#111827] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
                value={meetingScheduledAt}
                onChange={(e) => setMeetingScheduledAt(e.target.value)}
              />
            </div>
            {meetingMode === "auto" && (
              <p className="text-sm text-base-content/70 font-body">
                Meeting will be created automatically when you save.
              </p>
            )}
            {meetingMode === "manual" && (
              <>
                {meetingMessage && (
                  <p className="text-sm text-base-content/70 font-body">{meetingMessage}</p>
                )}
                <div className="form-control w-full">
                  <label className="label">
                    <span className="label-text font-body font-medium text-base-content">Meeting URL (manual)</span>
                  </label>
                  <input
                    type="url"
                    className="input input-bordered rounded-lg w-full font-body placeholder-[#9ca3af] text-[#111827] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
                    placeholder="https://..."
                    value={meetingUrl}
                    onChange={(e) => setMeetingUrl(e.target.value)}
                  />
                </div>
              </>
            )}
          </>
        )}
        <label className="label cursor-pointer justify-start gap-2">
          <input
            type="checkbox"
            className="checkbox checkbox-primary rounded"
            checked={allowSelfEnrollment}
            onChange={(e) => setAllowSelfEnrollment(e.target.checked)}
          />
          <span className="label-text font-body">Allow self-enrollment</span>
        </label>
        <label className="label cursor-pointer justify-start gap-2">
          <input
            type="checkbox"
            className="checkbox checkbox-primary rounded"
            checked={isPublished}
            onChange={(e) => setIsPublished(e.target.checked)}
          />
          <span className="label-text font-body">Published</span>
        </label>
        {error && <p className="text-error font-body text-sm">{error}</p>}
        {meetingError && (
          <p className="text-warning font-body text-sm">
            Class saved. {meetingError}
          </p>
        )}
        <div className="card-actions justify-end gap-3 pt-4 border-t border-base-300">
          <button type="button" onClick={() => router.back()} className="btn btn-ghost rounded-xl font-body">
            Cancel
          </button>
          <button type="submit" className="btn btn-primary rounded-xl font-body" disabled={loading}>
            {loading
              ? submitPhase === "creating_meeting"
                ? "Creating meeting…"
                : "Saving class…"
              : initial
                ? "Update"
                : "Save Class"}
          </button>
        </div>
      </div>
    </form>
  );
}
