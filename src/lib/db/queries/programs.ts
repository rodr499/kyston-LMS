import { db } from "@/lib/db";
import {
  programs,
  courses,
  classes,
  users,
} from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

export async function getPublishedProgramsWithCoursesAndClasses(churchId: string) {
  // Fetch all three levels in parallel, then assemble in memory — no N+1 queries
  const [programList, courseList, classList] = await Promise.all([
    db
      .select()
      .from(programs)
      .where(and(eq(programs.churchId, churchId), eq(programs.isPublished, true))),
    db
      .select()
      .from(courses)
      .where(and(eq(courses.churchId, churchId), eq(courses.isPublished, true))),
    db
      .select({
        id: classes.id,
        courseId: classes.courseId,
        name: classes.name,
        allowSelfEnrollment: classes.allowSelfEnrollment,
        meetingUrl: classes.meetingUrl,
        isPublished: classes.isPublished,
        facilitatorFullName: users.fullName,
      })
      .from(classes)
      .leftJoin(users, eq(classes.facilitatorId, users.id))
      .where(
        and(
          eq(classes.churchId, churchId),
          eq(classes.isPublished, true)
        )
      ),
  ]);

  const programIds = new Set(programList.map((p) => p.id));
  const relevantCourses = courseList.filter((c) => programIds.has(c.programId));
  const courseIds = new Set(relevantCourses.map((c) => c.id));
  const relevantClasses = classList.filter((cl) => courseIds.has(cl.courseId));

  const classesByCourse = new Map<string, typeof relevantClasses>();
  for (const cl of relevantClasses) {
    const list = classesByCourse.get(cl.courseId) ?? [];
    list.push(cl);
    classesByCourse.set(cl.courseId, list);
  }

  const coursesByProgram = new Map<string, typeof relevantCourses>();
  for (const c of relevantCourses) {
    const list = coursesByProgram.get(c.programId) ?? [];
    list.push(c);
    coursesByProgram.set(c.programId, list);
  }

  return programList.map((p) => ({
    ...p,
    courses: (coursesByProgram.get(p.id) ?? []).map((c) => ({
      ...c,
      classes: (classesByCourse.get(c.id) ?? []).map((cl) => ({
        id: cl.id,
        name: cl.name,
        allowSelfEnrollment: cl.allowSelfEnrollment,
        meetingUrl: cl.meetingUrl,
        isPublished: cl.isPublished,
        facilitator: cl.facilitatorFullName ? { fullName: cl.facilitatorFullName } : null,
      })),
    })),
  }));
}
