import { getTenant } from "@/lib/tenant";
import { db } from "@/lib/db";
import { programs, courses, classes as classesTable, users } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import ClassForm from "@/components/admin/ClassForm";
import DeleteClassButton from "@/components/admin/DeleteClassButton";
import ClassListFeedback from "@/components/admin/ClassListFeedback";

export default async function ClassDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; courseId: string; classId: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const tenant = await getTenant();
  if (!tenant) return null;
  const { id: programId, courseId, classId } = await params;
  const { saved } = await searchParams;
  const program = await db.query.programs.findFirst({
    where: and(eq(programs.id, programId), eq(programs.churchId, tenant.churchId)),
  });
  const course = await db.query.courses.findFirst({
    where: and(eq(courses.id, courseId), eq(courses.churchId, tenant.churchId)),
  });
  const cls = await db.query.classes.findFirst({
    where: and(eq(classesTable.id, classId), eq(classesTable.churchId, tenant.churchId)),
  });
  if (!program || !course || !cls) notFound();
  const facilitators = await db.query.users.findMany({
    where: and(eq(users.churchId, tenant.churchId), eq(users.role, "facilitator")),
    columns: { id: true, fullName: true },
  });
  const contactUsers = await db.query.users.findMany({
    where: and(eq(users.churchId, tenant.churchId), eq(users.isActive, true)),
    columns: { id: true, fullName: true, email: true },
    orderBy: (u, { asc }) => [asc(u.fullName)],
  });
  return (
    <div>
      <ClassListFeedback saved={saved} />
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold text-base-content">Edit class</h1>
          <p className="text-base-content/60 font-body mt-1">{cls.name}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <DeleteClassButton
            classId={cls.id}
            churchId={tenant.churchId}
            programId={programId}
            courseId={courseId}
            label="Delete class"
            variant="error"
          />
        </div>
      </div>
      <ClassForm
        churchId={tenant.churchId}
        programId={programId}
        courseId={courseId}
        facilitators={facilitators}
        contactUsers={contactUsers}
        initial={{
          id: cls.id,
          name: cls.name,
          mode: cls.mode,
          gradingSystem: cls.gradingSystem,
          facilitatorId: cls.facilitatorId,
          allowSelfEnrollment: cls.allowSelfEnrollment,
          noEnrollmentNeeded: cls.noEnrollmentNeeded,
          isPublished: cls.isPublished,
          closedForEnrollment: cls.closedForEnrollment,
          closedContactUserId: cls.closedContactUserId,
          meetingPlatform: cls.meetingPlatform,
          meetingUrl: cls.meetingUrl,
          meetingScheduledAt: cls.meetingScheduledAt,
          meetingDurationMinutes: cls.meetingDurationMinutes ?? 60,
          meetingRecurrence: cls.meetingRecurrence as { type: "weekly"; daysOfWeek: number[]; endDate: string } | null,
        }}
      />
    </div>
  );
}
