import { getTenant } from "@/lib/tenant";
import { db } from "@/lib/db";
import { programs, courses, classes as classesTable, users } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import ClassForm from "@/components/admin/ClassForm";

export default async function ClassDetailPage({
  params,
}: {
  params: Promise<{ id: string; courseId: string; classId: string }>;
}) {
  const tenant = await getTenant();
  if (!tenant) return null;
  const { id: programId, courseId, classId } = await params;
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
  return (
    <div>
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-bold text-base-content">Edit class</h1>
        <p className="text-base-content/60 font-body mt-1">{cls.name}</p>
      </div>
      <ClassForm
        churchId={tenant.churchId}
        programId={programId}
        courseId={courseId}
        courseName={course.name}
        facilitators={facilitators}
        initial={{
          id: cls.id,
          name: cls.name,
          mode: cls.mode,
          gradingSystem: cls.gradingSystem,
          facilitatorId: cls.facilitatorId,
          allowSelfEnrollment: cls.allowSelfEnrollment,
          isPublished: cls.isPublished,
          meetingPlatform: cls.meetingPlatform,
          meetingUrl: cls.meetingUrl,
          meetingScheduledAt: cls.meetingScheduledAt,
        }}
      />
    </div>
  );
}
