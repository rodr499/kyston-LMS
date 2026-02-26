import Link from "next/link";
import EnrollButton from "./EnrollButton";
import { BookOpen } from "lucide-react";

type Class = {
  id: string;
  name: string;
  allowSelfEnrollment: boolean;
  meetingUrl: string | null;
  facilitator?: { fullName: string } | null;
};

type Course = {
  id: string;
  name: string;
  classes: Class[];
};

type Program = {
  id: string;
  name: string;
  description: string | null;
  courses: Course[];
};

type Props = {
  church: { name: string; logoUrl: string | null; primaryColor: string };
  programs: Program[];
  enrolledClassIds: Set<string>;
  userId: string | null;
};

export default function LearningHub({ church, programs, enrolledClassIds, userId }: Props) {
  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      {/* Navbar */}
      <nav className="navbar bg-[#fafafa] shadow-sm border-b border-[#e5e7eb] sticky top-0 z-30 px-4 sm:px-6">
        <div className="container mx-auto px-0 flex w-full items-center justify-between">
          <div>
            {church.logoUrl ? (
              <img src={church.logoUrl} alt={church.name} className="h-10" />
            ) : (
              <span className="font-heading text-xl font-bold" style={{ color: church.primaryColor }}>
                {church.name}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {userId ? (
              <>
                <Link href="/learn" className="btn btn-ghost btn-sm rounded-xl font-body">My classes</Link>
                <Link href="/login" className="btn btn-ghost btn-sm rounded-xl font-body">Account</Link>
              </>
            ) : (
              <>
                <Link href="/login" className="btn btn-ghost btn-sm rounded-xl font-body">Sign in</Link>
                <Link href="/register" className="btn btn-primary btn-sm rounded-xl font-body">Register</Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="bg-gradient-to-br from-primary/10 via-secondary/5 to-transparent border-b border-base-300">
        <div className="container mx-auto px-4 sm:px-6 py-8 sm:py-12">
          <h1 className="font-heading text-3xl sm:text-4xl font-bold text-base-content mb-2">Learning Hub</h1>
          <p className="font-body text-base-content/70 max-w-xl">
            Browse programs and classes. Enroll in open classes or sign in to continue where you left off.
          </p>
        </div>
      </section>

      <main className="container mx-auto px-4 sm:px-6 py-8 sm:py-10">
        {programs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
              <BookOpen className="w-10 h-10 text-primary/60" />
            </div>
            <h3 className="font-heading text-xl font-semibold text-base-content mb-2">No programs yet</h3>
            <p className="font-body text-base-content/50 text-sm max-w-xs mb-6">
              No programs or classes are published yet. Check back later or sign in to see your enrolled classes.
            </p>
            {userId && (
              <Link href="/learn" className="btn btn-primary rounded-xl gap-2 font-body">Go to my classes</Link>
            )}
          </div>
        ) : (
          <div className="space-y-14">
            {programs.map((program) => (
              <section key={program.id} className="scroll-mt-8">
                <div className="flex flex-col sm:flex-row sm:items-end gap-2 mb-6">
                  <h2 className="font-heading text-2xl font-bold text-base-content">{program.name}</h2>
                  {program.description && (
                    <p className="font-body text-base-content/70 text-sm sm:mt-1">{program.description}</p>
                  )}
                </div>
                <div className="space-y-8">
                  {program.courses.map((course) => (
                    <div key={course.id}>
                      <h3 className="font-heading text-lg font-semibold text-base-content/90 mb-4 flex items-center gap-2">
                        <span className="badge badge-primary badge-outline badge-sm font-body">{course.name}</span>
                      </h3>
                      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {course.classes.map((cls) => (
                          <div
                            key={cls.id}
                            className="card bg-white shadow-sm rounded-2xl border border-[#e5e7eb] hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 overflow-hidden"
                          >
                            <div className="card-body">
                              <div className="flex items-start justify-between gap-2">
                                <h4 className="font-heading card-title text-lg leading-tight">{cls.name}</h4>
                                {enrolledClassIds.has(cls.id) && (
                                  <span className="badge badge-success badge-sm gap-1 font-body shrink-0">
                                    <span className="w-1.5 h-1.5 rounded-full bg-white inline-block" />
                                    Enrolled
                                  </span>
                                )}
                              </div>
                              {cls.facilitator && (
                                <p className="font-body text-sm text-base-content/60">
                                  <span className="opacity-70">Led by</span> {cls.facilitator.fullName}
                                </p>
                              )}
                              <div className="card-actions justify-end mt-4 pt-4 border-t border-base-300">
                                {enrolledClassIds.has(cls.id) ? (
                                  <Link href="/learn" className="btn btn-primary btn-sm rounded-xl font-body">
                                    Go to class
                                  </Link>
                                ) : cls.allowSelfEnrollment && userId ? (
                                  <EnrollButton classId={cls.id} />
                                ) : cls.allowSelfEnrollment && !userId ? (
                                  <Link href="/login" className="btn btn-outline btn-sm rounded-xl font-body">
                                    Sign in to enroll
                                  </Link>
                                ) : (
                                  <span className="font-body text-xs text-base-content/50">Enrollment by invite</span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>

      <footer className="footer footer-center p-8 bg-[#1a1a2e] text-[#e2e8f0] mt-12">
        <p className="font-body text-sm text-neutral-content/70">{church.name} — Learning Hub</p>
      </footer>
    </div>
  );
}
