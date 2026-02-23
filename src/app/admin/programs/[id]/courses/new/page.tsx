import { getTenant } from "@/lib/tenant";
import { db } from "@/lib/db";
import { programs } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import CourseForm from "@/components/admin/CourseForm";

export default async function NewCoursePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const tenant = await getTenant();
  if (!tenant) return null;
  const { id: programId } = await params;
  const program = await db.query.programs.findFirst({
    where: and(eq(programs.id, programId), eq(programs.churchId, tenant.churchId)),
  });
  if (!program) notFound();
  return (
    <div>
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-bold text-base-content">New course</h1>
        <p className="text-base-content/60 font-body mt-1">Add a course to {program.name}.</p>
      </div>
      <CourseForm churchId={tenant.churchId} programId={programId} />
    </div>
  );
}
