import { db } from "@/lib/db";
import {
  programs,
  courses,
  classes,
  users,
} from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

export async function getPublishedProgramsWithCoursesAndClasses(churchId: string) {
  const programList = await db
    .select()
    .from(programs)
    .where(and(eq(programs.churchId, churchId), eq(programs.isPublished, true)));

  const result = await Promise.all(
    programList.map(async (p) => {
      const courseList = await db
        .select()
        .from(courses)
        .where(
          and(eq(courses.programId, p.id), eq(courses.isPublished, true))
        );
      const coursesWithClasses = await Promise.all(
        courseList.map(async (c) => {
          const classList = await db
            .select({
              id: classes.id,
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
                eq(classes.courseId, c.id),
                eq(classes.isPublished, true)
              )
            );
          return {
            ...c,
            classes: classList.map((cl) => ({
              id: cl.id,
              name: cl.name,
              allowSelfEnrollment: cl.allowSelfEnrollment,
              meetingUrl: cl.meetingUrl,
              isPublished: cl.isPublished,
              facilitator: cl.facilitatorFullName
                ? { fullName: cl.facilitatorFullName }
                : null,
            })),
          };
        })
      );
      return {
        ...p,
        courses: coursesWithClasses,
      };
    })
  );
  return result;
}
