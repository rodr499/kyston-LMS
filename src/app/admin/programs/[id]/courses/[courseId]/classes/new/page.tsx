import { getTenant } from "@/lib/tenant";
import { db } from "@/lib/db";
import { programs, courses, users } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import ClassForm from "@/components/admin/ClassForm";

export default async function NewClassPage({
  params,
}: {
  params: Promise<{ id: string; courseId: string }>;
}) {
  const tenant = await getTenant();
  if (!tenant) return null;
  const { id: programId, courseId } = await params;
  const program = await db.query.programs.findFirst({
    where: and(eq(programs.id, programId), eq(programs.churchId, tenant.churchId)),
  });
  const course = await db.query.courses.findFirst({
    where: and(eq(courses.id, courseId), eq(courses.churchId, tenant.churchId)),
  });
  if (!program || !course) notFound();
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
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-bold text-base-content">New class</h1>
        <p className="text-base-content/60 font-body mt-1">{course.name}</p>
      </div>
      <ClassForm
        churchId={tenant.churchId}
        programId={programId}
        courseId={courseId}
        facilitators={facilitators}
        contactUsers={contactUsers}
      />
    </div>
  );
}
