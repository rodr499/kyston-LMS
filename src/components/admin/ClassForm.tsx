"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { checkMeetingEligibilityAction, generateClassMeetingLinkAction, updateClassMeetingLinkAction } from "@/lib/actions/class-meeting-actions";
import type { MeetingEligibilityMode } from "@/lib/actions/class-meeting-actions";
import RemoveMeetingButton from "@/components/admin/RemoveMeetingButton";
import { Link2, RefreshCw } from "lucide-react";
import { Info } from "lucide-react";

type Facilitator = { id: string; fullName: string };
type ContactUser = { id: string; fullName: string; email: string };

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
  facilitators,
  contactUsers,
  initial = null,
}: {
  churchId: string;
  programId: string;
  courseId: string;
  facilitators: Facilitator[];
  contactUsers: ContactUser[];
  initial?: {
    id: string;
    name: string;
    mode: string;
    gradingSystem: string;
    facilitatorId: string | null;
    allowSelfEnrollment: boolean;
    noEnrollmentNeeded: boolean;
    isPublished: boolean;
    closedForEnrollment: boolean;
    closedContactUserId: string | null;
    meetingPlatform: string;
    meetingUrl: string | null;
    meetingScheduledAt: Date | null;
    meetingDurationMinutes?: number | null;
    meetingRecurrence?: { type: "weekly"; daysOfWeek: number[]; endDate: string } | null;
  } | null;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [mode, setMode] = useState(initial?.mode ?? "on_demand");
  const [gradingSystem, setGradingSystem] = useState(initial?.gradingSystem ?? "completion");
  const [facilitatorId, setFacilitatorId] = useState(initial?.facilitatorId ?? "");
  const [allowSelfEnrollment, setAllowSelfEnrollment] = useState(initial?.allowSelfEnrollment ?? false);
  const [noEnrollmentNeeded, setNoEnrollmentNeeded] = useState(initial?.noEnrollmentNeeded ?? false);
  const [isPublished, setIsPublished] = useState(initial?.isPublished ?? false);
  const [closedForEnrollment, setClosedForEnrollment] = useState(initial?.closedForEnrollment ?? false);
  const [closedContactUserId, setClosedContactUserId] = useState(initial?.closedContactUserId ?? "");
  const [meetingPlatform, setMeetingPlatform] = useState(initial?.meetingPlatform ?? "none");
  const [meetingUrl, setMeetingUrl] = useState(initial?.meetingUrl ?? "");
  const [meetingScheduledAt, setMeetingScheduledAt] = useState(
    initial?.meetingScheduledAt ? toDatetimeLocal(initial.meetingScheduledAt) : ""
  );
  const [meetingDurationMinutes, setMeetingDurationMinutes] = useState(
    initial?.meetingDurationMinutes ?? 60
  );
  const rec = initial?.meetingRecurrence;
  const [meetingRecurring, setMeetingRecurring] = useState(
    !!(rec?.type === "weekly" && rec.daysOfWeek?.length && rec.endDate)
  );
  const [meetingRecurrenceDays, setMeetingRecurrenceDays] = useState<number[]>(
    rec?.type === "weekly" && Array.isArray(rec.daysOfWeek) ? rec.daysOfWeek : []
  );
  const [meetingRecurrenceEndDate, setMeetingRecurrenceEndDate] = useState(
    rec?.endDate ?? ""
  );
  const [meetingMode, setMeetingMode] = useState<MeetingEligibilityMode>("none");
  const [meetingError, setMeetingError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitPhase, setSubmitPhase] = useState<"idle" | "saving" | "creating_meeting" | "updating_meeting">("idle");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handlePlatformChange = useCallback(
    async (platform: string) => {
      setMeetingPlatform(platform);
      setMeetingError(null);
      if (platform === "none") {
        setMeetingMode("none");
        return;
      }
      const result = await checkMeetingEligibilityAction(churchId, platform);
      setMeetingMode(result.mode);
    },
    [churchId]
  );

  useEffect(() => {
    if (initial?.meetingPlatform && initial.meetingPlatform !== "none") {
      checkMeetingEligibilityAction(churchId, initial.meetingPlatform)
        .then((result) => {
          setMeetingMode(result.mode);
        })
        .catch((err) => {
          console.error("[ClassForm] eligibility check failed:", err);
          setMeetingMode("none");
        });
    }
  }, [churchId, initial?.meetingPlatform]);

  // Sync meetingUrl state when the prop changes (e.g. after Generate / Remove meeting link).
  useEffect(() => {
    setMeetingUrl(initial?.meetingUrl ?? "");
  }, [initial?.meetingUrl]);

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault();
    setError(null);
    setMeetingError(null);
    setLoading(true);
    setSubmitPhase("saving");
    let navigating = false;
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
          noEnrollmentNeeded,
          isPublished,
          closedForEnrollment,
          closedContactUserId: closedContactUserId || null,
          meetingPlatform,
          // meetingUrl is intentionally excluded from PATCH — it is only modified by
          // the "Generate meeting link" / "Update meeting" buttons.
          ...(!initial && { meetingUrl: meetingUrl || null }),
          meetingScheduledAt: meetingScheduledAt || null,
          meetingDurationMinutes: meetingDurationMinutes || 60,
          meetingRecurrence:
            meetingPlatform === "teams" && meetingRecurring && meetingRecurrenceDays.length > 0 && meetingRecurrenceEndDate
              ? { type: "weekly" as const, daysOfWeek: meetingRecurrenceDays, endDate: meetingRecurrenceEndDate }
              : null,
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
      const data = await res.json();
      const basePath = `/admin/programs/${programId}/courses/${courseId}/classes`;
      if (!initial && data.id) {
        // Auto-generate meeting link for new classes when platform and date are set.
        if (meetingPlatform !== "none" && meetingScheduledAt) {
          setSubmitPhase("creating_meeting");
          await generateClassMeetingLinkAction({
            classId: data.id,
            churchId,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          });
        }
      }
      // Both edit and new navigate to the classes list (different page → component
      // unmounts → spinner clears on its own via the navigating flag).
      navigating = true;
      router.push(`${basePath}?saved=1`);
    } catch {
      setError("Something went wrong");
    } finally {
      if (!navigating) {
        setLoading(false);
        setSubmitPhase("idle");
      }
    }
  }

  /** Save the class form first, then create/update the Teams meeting in one step. */
  async function handleMeetingAction(isUpdate: boolean) {
    setLoading(true);
    setSubmitPhase("saving");
    setError(null);
    setMeetingError(null);
    try {
      const res = await fetch("/api/admin/classes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          churchId,
          courseId,
          name,
          mode,
          gradingSystem,
          facilitatorId: facilitatorId || null,
          allowSelfEnrollment,
          noEnrollmentNeeded,
          isPublished,
          closedForEnrollment,
          closedContactUserId: closedContactUserId || null,
          meetingPlatform,
          meetingScheduledAt: meetingScheduledAt || null,
          meetingDurationMinutes: meetingDurationMinutes || 60,
          meetingRecurrence:
            meetingPlatform === "teams" && meetingRecurring && meetingRecurrenceDays.length > 0 && meetingRecurrenceEndDate
              ? { type: "weekly" as const, daysOfWeek: meetingRecurrenceDays, endDate: meetingRecurrenceEndDate }
              : null,
          classId: initial!.id,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Failed to save");
        return;
      }
      setSubmitPhase(isUpdate ? "updating_meeting" : "creating_meeting");
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const result = isUpdate
        ? await updateClassMeetingLinkAction({ classId: initial!.id, churchId, timezone })
        : await generateClassMeetingLinkAction({ classId: initial!.id, churchId, timezone });
      if (!result.success) {
        setMeetingError(result.error ?? "Meeting update failed");
      }
    } catch {
      setError("Something went wrong");
    } finally {
      // Always clear the overlay — we stay on the same page and refresh server data.
      setLoading(false);
      setSubmitPhase("idle");
      router.refresh();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="relative card bg-white shadow-sm rounded-2xl border border-[#e5e7eb] max-w-2xl">
      {loading && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-2xl bg-white/80 backdrop-blur-sm">
          <span className="loading loading-spinner loading-lg text-primary" />
          <span className="font-body text-sm text-base-content/70">
            {submitPhase === "updating_meeting" ? "Updating meeting…" : submitPhase === "creating_meeting" ? "Creating meeting…" : "Saving class…"}
          </span>
        </div>
      )}
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
            <div className="form-control w-full max-w-xs">
              <label className="label">
                <span className="label-text font-body font-medium text-base-content">Duration (minutes)</span>
              </label>
              <select
                className="select select-bordered rounded-lg font-body w-full text-[#111827] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
                value={meetingDurationMinutes}
                onChange={(e) => setMeetingDurationMinutes(Number(e.target.value))}
              >
                <option value={30}>30 min</option>
                <option value={45}>45 min</option>
                <option value={60}>1 hour</option>
                <option value={90}>1.5 hours</option>
                <option value={120}>2 hours</option>
                <option value={180}>3 hours</option>
                <option value={240}>4 hours</option>
                <option value={300}>5 hours</option>
                <option value={360}>6 hours</option>
                <option value={420}>7 hours</option>
                <option value={480}>8 hours</option>
              </select>
            </div>
            {meetingPlatform === "teams" && (
              <>
                <label className="label cursor-pointer justify-start gap-2">
                  <input
                    type="checkbox"
                    className="checkbox checkbox-primary rounded"
                    checked={meetingRecurring}
                    onChange={(e) => setMeetingRecurring(e.target.checked)}
                  />
                  <span className="label-text font-body">Recurring meeting (weekly for the life of the class)</span>
                </label>
                {meetingRecurring && (
                  <>
                    <div className="form-control w-full">
                      <span className="label-text font-body font-medium text-base-content mb-1 block">Repeat on</span>
                      <div className="flex flex-wrap gap-3">
                        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, i) => (
                          <label key={day} className="label cursor-pointer justify-start gap-2 py-0">
                            <input
                              type="checkbox"
                              className="checkbox checkbox-sm checkbox-primary rounded"
                              checked={meetingRecurrenceDays.includes(i)}
                              onChange={(e) => {
                                if (e.target.checked) setMeetingRecurrenceDays((d) => [...d, i].sort());
                                else setMeetingRecurrenceDays((d) => d.filter((x) => x !== i));
                              }}
                            />
                            <span className="label-text font-body text-sm">{day}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="form-control w-full">
                      <label className="label">
                        <span className="label-text font-body font-medium text-base-content">Series end date</span>
                      </label>
                      <input
                        type="date"
                        className="input input-bordered rounded-lg w-full font-body text-[#111827] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
                        value={meetingRecurrenceEndDate}
                        onChange={(e) => setMeetingRecurrenceEndDate(e.target.value)}
                      />
                    </div>
                  </>
                )}
              </>
            )}
            <div className="form-control w-full">
              <label className="label">
                <span className="label-text font-body font-medium text-base-content">
                  {meetingMode === "auto" ? "Meeting URL (optional – paste if auto-creation isn’t available)" : "Meeting URL"}
                </span>
              </label>
              {(() => {
                const urlFromAutoCreate = meetingMode === "auto" && (initial?.meetingUrl ?? meetingUrl)?.trim();
                const isDisabled = !!urlFromAutoCreate;
                return (
                  <>
                    <input
                      type="url"
                      className={`input input-bordered rounded-lg w-full font-body placeholder-[#9ca3af] text-[#111827] transition-all duration-200 ${isDisabled ? "input-disabled bg-base-200 cursor-not-allowed" : "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"}`}
                      placeholder="https://teams.microsoft.com/..."
                      value={meetingUrl}
                      onChange={(e) => setMeetingUrl(e.target.value)}
                      disabled={isDisabled}
                      readOnly={isDisabled}
                      aria-readonly={isDisabled}
                    />
                  </>
                );
              })()}
            </div>
            <div className="flex items-start gap-2 rounded-xl border border-info/30 bg-info/5 px-4 py-3 text-sm font-body text-base-content/70">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-info" />
              <div className="space-y-1">
                {!initial ? (
                  <p>
                    {meetingPlatform !== "none" && meetingScheduledAt
                      ? "The meeting link will be created automatically when you save."
                      : "Set the date and time before saving — the meeting link will be created automatically."}
                  </p>
                ) : !initial.meetingUrl ? (
                  <p>
                    Set the date, time, and duration, then click{" "}
                    <span className="font-medium text-base-content">Generate meeting link</span> to create the{" "}
                    {meetingPlatform === "teams" && meetingRecurring ? "recurring Teams calendar series" : "meeting"}.
                    {meetingPlatform === "teams" && !meetingRecurring && (
                      <> Note: updating a single meeting later will replace it with a new one and <span className="font-medium text-base-content">change the join link</span>.</>
                    )}
                  </p>
                ) : meetingRecurring ? (
                  <>
                    <p>
                      <span className="font-medium text-base-content">Update meeting</span> will update the existing Teams
                      calendar invite — syncing the title, time, and recurrence.{" "}
                      <span className="font-medium text-base-content">The join link will stay the same.</span>
                    </p>
                    <p>Saving this form updates the class settings only — it never modifies the meeting link.</p>
                  </>
                ) : (
                  <>
                    <p>
                      <span className="font-medium text-base-content">Update meeting</span> will delete the current Teams
                      meeting and create a new one.{" "}
                      <span className="font-medium text-base-content">The join link will change</span> — share the new link
                      with participants after updating.
                    </p>
                    <p>Saving this form updates the class settings only — it never modifies the meeting link.</p>
                  </>
                )}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {initial && (() => {
                const isUpdate = !!initial.meetingUrl;
                return (
                  <>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm rounded-lg font-body gap-2"
                      onClick={() => handleMeetingAction(isUpdate)}
                      disabled={loading || !meetingScheduledAt}
                    >
                      {loading && submitPhase !== "saving"
                        ? <span className="loading loading-spinner loading-xs" />
                        : isUpdate ? <RefreshCw className="w-4 h-4" /> : <Link2 className="w-4 h-4" />}
                      {isUpdate ? "Update meeting" : "Generate meeting link"}
                    </button>
                    {initial.meetingUrl && (
                      <RemoveMeetingButton classId={initial.id} churchId={churchId} />
                    )}
                  </>
                );
              })()}
            </div>
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
            checked={noEnrollmentNeeded}
            onChange={(e) => setNoEnrollmentNeeded(e.target.checked)}
          />
          <span className="label-text font-body">No enrollment needed (share link only)</span>
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
        <div className="form-control w-full">
          <label className="label cursor-pointer justify-start gap-3">
            <input
              type="checkbox"
              className="checkbox checkbox-primary rounded"
              checked={closedForEnrollment}
              onChange={(e) => setClosedForEnrollment(e.target.checked)}
            />
            <span className="label-text font-body font-medium text-base-content">Closed for enrollment</span>
          </label>
          <p className="font-body text-sm text-base-content/60 mt-0.5 ml-7">Class stays visible; no new enrollments. Show a contact for people who still want to attend.</p>
        </div>
        {closedForEnrollment && (
          <div className="form-control w-full ml-7">
            <label className="label">
              <span className="label-text font-body font-medium text-base-content">Contact when closed</span>
            </label>
            <select
              className="select select-bordered rounded-lg font-body w-full text-[#111827] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
              value={closedContactUserId}
              onChange={(e) => setClosedContactUserId(e.target.value)}
            >
              <option value="">Select a contact…</option>
              {contactUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.fullName} ({u.email})
                </option>
              ))}
            </select>
          </div>
        )}
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
            {initial ? "Update" : "Save Class"}
          </button>
        </div>
      </div>
    </form>
  );
}
