"use client";

import { useState, useEffect } from "react";
import { Calendar } from "lucide-react";

type CalendarItem = { id: string; name: string };

export default function TeamsCalendarPicker() {
  const [calendars, setCalendars] = useState<CalendarItem[]>([]);
  const [selectedCalendarId, setSelectedCalendarId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    fetch("/api/admin/teams-calendars")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load calendars");
        return res.json();
      })
      .then((data: { calendars?: CalendarItem[]; selectedCalendarId?: string | null }) => {
        if (cancelled) return;
        setCalendars(data.calendars ?? []);
        setSelectedCalendarId(data.selectedCalendarId ?? null);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleChange(value: string) {
    const calendarId = value === "" ? null : value;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/teams-calendars", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ calendarId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to save");
      }
      setSelectedCalendarId(calendarId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-base-content/60 font-body text-sm">
        <Calendar className="w-4 h-4" />
        <span>Loading calendars…</span>
      </div>
    );
  }

  if (error && calendars.length === 0) {
    return (
      <div className="text-warning font-body text-sm flex items-center gap-2">
        <Calendar className="w-4 h-4" />
        <span>{error}</span>
      </div>
    );
  }

  return (
    <div className="form-control w-full max-w-md">
      <label className="label py-1">
        <span className="label-text font-body font-medium text-base-content flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          Calendar for new meetings
        </span>
      </label>
      <select
        className="select select-bordered rounded-lg font-body w-full text-[#111827] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
        value={selectedCalendarId ?? ""}
        onChange={(e) => handleChange(e.target.value)}
        disabled={saving}
      >
        <option value="">Default calendar</option>
        {calendars.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      {error && <p className="text-error text-sm font-body mt-1">{error}</p>}
      {saving && <p className="text-base-content/60 text-sm font-body mt-1">Saving…</p>}
    </div>
  );
}
