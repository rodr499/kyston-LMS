import { NextResponse } from "next/server";
import { getTenant } from "@/lib/tenant";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { users, classes, courses } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

const VALID_MODES = ["on_demand", "academic"] as const;
const VALID_GRADING = ["completion", "pass_fail", "letter_grade"] as const;
const VALID_MEETING_PLATFORMS = ["none", "zoom", "teams", "google_meet"] as const;
const ALLOWED_MEETING_DOMAINS = ["zoom.us", "teams.microsoft.com", "meet.google.com"];

type ClassMode = typeof VALID_MODES[number];
type GradingSystem = typeof VALID_GRADING[number];
type MeetingPlatform = typeof VALID_MEETING_PLATFORMS[number];

function validateMeetingUrl(url: string | null | undefined): { valid: true; url: string | null } | { valid: false; error: string } {
  if (!url) return { valid: true, url: null };
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return { valid: false, error: "Meeting URL must use http or https" };
    }
    if (!ALLOWED_MEETING_DOMAINS.some((d) => parsed.hostname === d || parsed.hostname.endsWith(`.${d}`))) {
      return { valid: false, error: "Meeting URL must be from Zoom, Teams, or Google Meet" };
    }
    return { valid: true, url };
  } catch {
    return { valid: false, error: "Invalid meeting URL" };
  }
}

export async function POST(request: Request) {
  const tenant = await getTenant();
  if (!tenant) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const u = await db.query.users.findFirst({
    where: eq(users.id, user.id),
    columns: { role: true, churchId: true },
  });
  if (u?.role !== "church_admin" || u.churchId !== tenant.churchId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await request.json();
  const {
    churchId,
    courseId,
    name,
    mode,
    gradingSystem,
    facilitatorId,
    allowSelfEnrollment,
    isPublished,
    meetingPlatform,
    meetingUrl,
    meetingScheduledAt,
  } = body as {
    churchId: string;
    courseId: string;
    name: string;
    mode?: string;
    gradingSystem?: string;
    facilitatorId?: string | null;
    allowSelfEnrollment?: boolean;
    isPublished?: boolean;
    meetingPlatform?: string;
    meetingUrl?: string | null;
    meetingScheduledAt?: string | null;
  };
  if (churchId !== tenant.churchId || !courseId || !name) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  // Validate enum values
  const resolvedMode = (VALID_MODES as readonly string[]).includes(mode ?? "") ? (mode as ClassMode) : "on_demand";
  const resolvedGrading = (VALID_GRADING as readonly string[]).includes(gradingSystem ?? "") ? (gradingSystem as GradingSystem) : "completion";
  const resolvedPlatform = (VALID_MEETING_PLATFORMS as readonly string[]).includes(meetingPlatform ?? "") ? (meetingPlatform as MeetingPlatform) : "none";

  // Validate meeting URL domain
  const urlResult = validateMeetingUrl(meetingUrl);
  if (!urlResult.valid) {
    return NextResponse.json({ error: urlResult.error }, { status: 400 });
  }

  // Verify courseId belongs to this church
  const course = await db.query.courses.findFirst({
    where: and(eq(courses.id, courseId), eq(courses.churchId, tenant.churchId)),
    columns: { id: true },
  });
  if (!course) {
    return NextResponse.json({ error: "Course not found" }, { status: 404 });
  }

  const [created] = await db.insert(classes).values({
    churchId,
    courseId,
    name,
    mode: resolvedMode,
    gradingSystem: resolvedGrading,
    facilitatorId: facilitatorId ?? null,
    allowSelfEnrollment: allowSelfEnrollment ?? false,
    isPublished: isPublished ?? false,
    meetingPlatform: resolvedPlatform,
    meetingUrl: urlResult.url,
    meetingScheduledAt: meetingScheduledAt ? new Date(meetingScheduledAt) : null,
  }).returning({ id: classes.id });
  return NextResponse.json({ id: created?.id });
}

export async function PATCH(request: Request) {
  const tenant = await getTenant();
  if (!tenant) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const u = await db.query.users.findFirst({
    where: eq(users.id, user.id),
    columns: { role: true, churchId: true },
  });
  if (u?.role !== "church_admin" || u.churchId !== tenant.churchId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await request.json();
  const { classId, name, mode, gradingSystem, facilitatorId, allowSelfEnrollment, isPublished, meetingPlatform, meetingUrl, meetingScheduledAt } = body as Record<string, unknown>;
  if (!classId) return NextResponse.json({ error: "classId required" }, { status: 400 });

  // Validate meeting URL if provided
  if (meetingUrl !== undefined) {
    const urlResult = validateMeetingUrl(meetingUrl as string | null | undefined);
    if (!urlResult.valid) {
      return NextResponse.json({ error: urlResult.error }, { status: 400 });
    }
  }

  // Validate enum values if provided
  const resolvedMode = mode != null && (VALID_MODES as readonly string[]).includes(mode as string) ? (mode as ClassMode) : undefined;
  const resolvedGrading = gradingSystem != null && (VALID_GRADING as readonly string[]).includes(gradingSystem as string) ? (gradingSystem as GradingSystem) : undefined;
  const resolvedPlatform = meetingPlatform != null && (VALID_MEETING_PLATFORMS as readonly string[]).includes(meetingPlatform as string) ? (meetingPlatform as MeetingPlatform) : undefined;

  const urlResult = meetingUrl !== undefined ? validateMeetingUrl(meetingUrl as string | null | undefined) : { valid: true as const, url: undefined };
  if (!urlResult.valid) {
    return NextResponse.json({ error: urlResult.error }, { status: 400 });
  }

  await db.update(classes).set({
    ...(name != null && { name: name as string }),
    ...(resolvedMode != null && { mode: resolvedMode }),
    ...(resolvedGrading != null && { gradingSystem: resolvedGrading }),
    ...(facilitatorId !== undefined && { facilitatorId: facilitatorId as string | null }),
    ...(allowSelfEnrollment != null && { allowSelfEnrollment: allowSelfEnrollment as boolean }),
    ...(isPublished != null && { isPublished: isPublished as boolean }),
    ...(resolvedPlatform != null && { meetingPlatform: resolvedPlatform }),
    ...(urlResult.url !== undefined && { meetingUrl: urlResult.url }),
    ...(meetingScheduledAt !== undefined && { meetingScheduledAt: meetingScheduledAt ? new Date(meetingScheduledAt as string) : null }),
    updatedAt: new Date(),
  }).where(and(eq(classes.id, classId as string), eq(classes.churchId, tenant.churchId)));
  return NextResponse.json({ ok: true });
}
