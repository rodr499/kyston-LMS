import { getTenant } from "@/lib/tenant";
import { db } from "@/lib/db";
import { courses } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import CourseForm from "@/components/admin/CourseForm";
import { CalendarDays } from "lucide-react";

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ id: string; courseId: string }>;
}) {
  const tenant = await getTenant();
  if (!tenant) return null;
  const { id: programId, courseId } = await params;
  const course = await db.query.courses.findFirst({
    where: and(eq(courses.id, courseId), eq(courses.churchId, tenant.churchId)),
  });
  if (!course) notFound();
  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="font-heading text-3xl font-bold text-base-content">Edit course</h1>
          <p className="text-base-content/60 font-body mt-1">{course.name}</p>
        </div>
        <Link href={`/admin/programs/${programId}/courses/${courseId}/classes`} className="btn btn-outline btn-primary rounded-xl gap-2 font-body">
          <CalendarDays className="w-4 h-4" /> Classes
        </Link>
      </div>
      <CourseForm
        churchId={tenant.churchId}
        programId={programId}
        initial={{
          id: course.id,
          name: course.name,
          description: course.description ?? "",
          isPublished: course.isPublished,
        }}
      />
    </div>
  );
}
