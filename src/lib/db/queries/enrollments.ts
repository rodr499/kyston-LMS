import { db } from "@/lib/db";
import { enrollments } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

export async function getEnrolledClassIdsForStudent(
  churchId: string,
  studentId: string
): Promise<Set<string>> {
  const rows = await db.query.enrollments.findMany({
    where: and(
      eq(enrollments.churchId, churchId),
      eq(enrollments.studentId, studentId),
      eq(enrollments.status, "enrolled")
    ),
    columns: { classId: true },
  });
  return new Set(rows.map((r) => r.classId));
}
