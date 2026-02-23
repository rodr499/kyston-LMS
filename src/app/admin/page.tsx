import { getTenant } from "@/lib/tenant";
import { db } from "@/lib/db";
import { users, programs, courses, classes, enrollments } from "@/lib/db/schema";
import { eq, and, sql, desc, inArray } from "drizzle-orm";
import Link from "next/link";
import { Users, UserCheck, BookOpen, GraduationCap, CalendarDays, Plus } from "lucide-react";

export default async function AdminDashboard() {
  const tenant = await getTenant();
  if (!tenant) return null;
  const churchId = tenant.churchId;

  const [studentCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(users)
    .where(and(eq(users.churchId, churchId), eq(users.role, "student")));
  const [facCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(users)
    .where(and(eq(users.churchId, churchId), eq(users.role, "facilitator")));
  const [programCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(programs)
    .where(eq(programs.churchId, churchId));
  const [classCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(classes)
    .where(eq(classes.churchId, churchId));

  const recentEnrollmentsRows = await db
    .select()
    .from(enrollments)
    .where(eq(enrollments.churchId, churchId))
    .orderBy(desc(enrollments.enrolledAt))
    .limit(5);
  const studentIds = [...new Set(recentEnrollmentsRows.map((e) => e.studentId).filter(Boolean))] as string[];
  const classIds = [...new Set(recentEnrollmentsRows.map((e) => e.classId).filter(Boolean))] as string[];
  const [studentsList, classesList] = await Promise.all([
    studentIds.length > 0
      ? db.select({ id: users.id, fullName: users.fullName, email: users.email }).from(users).where(inArray(users.id, studentIds))
      : Promise.resolve([]),
    classIds.length > 0
      ? db.select({ id: classes.id, name: classes.name }).from(classes).where(inArray(classes.id, classIds))
      : Promise.resolve([]),
  ]);
  const studentMap = new Map(studentsList.map((s) => [s.id, s]));
  const classMap = new Map(classesList.map((c) => [c.id, c]));
  const recentEnrollments = recentEnrollmentsRows.map((e) => ({
    ...e,
    student: e.studentId ? studentMap.get(e.studentId) ?? null : null,
    class: e.classId ? classMap.get(e.classId) ?? null : null,
  }));

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  })();

  return (
    <div>
      <div className="mb-6 md:mb-8">
        <h1 className="font-heading text-2xl sm:text-3xl font-bold text-base-content">{greeting} 👋</h1>
        <p className="text-base-content/60 font-body mt-1 text-sm sm:text-base">Here&apos;s what&apos;s happening at your church today.</p>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-2 xl:grid-cols-4 mb-6 md:mb-8">
        <div className="stat bg-white rounded-2xl shadow-sm border border-[#e5e7eb]">
          <div className="stat-figure text-primary">
            <Users className="w-8 h-8" />
          </div>
          <div className="stat-title text-base-content/60 font-body text-xs uppercase tracking-widest">Students</div>
          <div className="stat-value text-primary font-heading text-3xl">{studentCount?.count ?? 0}</div>
        </div>
        <div className="stat bg-white rounded-2xl shadow-sm border border-[#e5e7eb]">
          <div className="stat-figure text-secondary">
            <UserCheck className="w-8 h-8" />
          </div>
          <div className="stat-title text-base-content/60 font-body text-xs uppercase tracking-widest">Facilitators</div>
          <div className="stat-value text-secondary font-heading text-3xl">{facCount?.count ?? 0}</div>
        </div>
        <div className="stat bg-white rounded-2xl shadow-sm border border-[#e5e7eb]">
          <div className="stat-figure text-primary">
            <BookOpen className="w-8 h-8" />
          </div>
          <div className="stat-title text-base-content/60 font-body text-xs uppercase tracking-widest">Programs</div>
          <div className="stat-value text-primary font-heading text-3xl">{programCount?.count ?? 0}</div>
        </div>
        <div className="stat bg-white rounded-2xl shadow-sm border border-[#e5e7eb]">
          <div className="stat-figure text-secondary">
            <CalendarDays className="w-8 h-8" />
          </div>
          <div className="stat-title text-base-content/60 font-body text-xs uppercase tracking-widest">Classes</div>
          <div className="stat-value text-secondary font-heading text-3xl">{classCount?.count ?? 0}</div>
        </div>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <div className="card bg-white shadow-sm rounded-2xl border border-[#e5e7eb] overflow-hidden">
            <div className="card-body p-0">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 sm:p-6 border-b border-base-300">
                <h3 className="font-heading text-lg font-semibold">Recent enrollments</h3>
                <Link href="/admin/programs" className="btn btn-primary btn-sm rounded-xl gap-2 font-body">
                  <GraduationCap className="w-4 h-4" /> View all
                </Link>
              </div>
              <div className="table-responsive-card overflow-x-auto">
                <table className="table table-zebra">
                  <thead>
                    <tr className="bg-base-200 text-base-content/60 text-xs uppercase tracking-widest font-body">
                      <th>Student</th>
                      <th>Class</th>
                      <th>Enrolled</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentEnrollments.length === 0 ? (
                      <tr>
                        <td colSpan={3} data-label=" " className="text-center text-base-content/50 font-body py-8">No enrollments yet.</td>
                      </tr>
                    ) : (
                      recentEnrollments.map((e) => (
                        <tr key={e.id} className="hover:bg-base-200 transition-colors">
                          <td data-label="Student" className="font-body font-medium">{e.student?.fullName ?? e.student?.email}</td>
                          <td data-label="Class" className="font-body">{e.class?.name}</td>
                          <td data-label="Enrolled" className="font-body text-base-content/70">{new Date(e.enrolledAt).toLocaleDateString()}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
        <div>
          <div className="card bg-white shadow-sm rounded-2xl border border-[#e5e7eb] hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">
            <div className="card-body">
              <h3 className="font-heading text-lg font-semibold">Quick actions</h3>
              <p className="text-base-content/70 text-sm font-body">Create programs, courses, and classes.</p>
              <div className="card-actions flex-col gap-2 mt-4">
                <Link href="/admin/programs/new" className="btn btn-primary rounded-xl gap-2 font-body w-full justify-start">
                  <Plus className="w-4 h-4" /> New program
                </Link>
                <Link href="/admin/users/invite" className="btn btn-outline btn-primary rounded-xl gap-2 font-body w-full justify-start">
                  <UserCheck className="w-4 h-4" /> Invite user
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
