import Link from "next/link";
import { getTenant } from "@/lib/tenant";
import { getTenantLimits } from "@/lib/tenant-config";
import { getChurchById } from "@/lib/db/queries/churches";
import { getPublishedProgramsWithCoursesAndClasses } from "@/lib/db/queries/programs";
import { getEnrolledClassIdsForStudent } from "@/lib/db/queries/enrollments";
import { createClient } from "@/lib/supabase/server";
import LearningHub from "@/components/tenant/LearningHub";

function ComingSoonView() {
  return (
    <div className="min-h-screen flex items-center justify-center relative bg-[#f8f9fa]">
      <div className="absolute inset-0 bg-gradient-to-br from-neutral/80 via-primary/70 to-secondary/60" aria-hidden />
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 gap-8">
        <span className="font-heading font-bold text-white text-4xl sm:text-5xl md:text-6xl tracking-tight drop-shadow-sm">
          KystonLMS
        </span>
        <div
          className="card bg-base-100 shadow-2xl rounded-2xl border border-base-300 max-w-md w-full p-8 sm:p-10 text-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="coming-soon-heading"
        >
          <h1
            id="coming-soon-heading"
            className="font-heading text-2xl sm:text-3xl font-bold text-base-content mb-2"
          >
            Something Great
          </h1>
          <p className="font-body text-base-content/80 text-lg mb-8">
            coming soon
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            <Link
              href="/login"
              className="btn btn-primary rounded-xl font-body font-semibold min-h-12 px-8 w-full sm:w-auto"
            >
              Sign in
            </Link>
            <Link
              href="/go"
              className="btn btn-ghost btn-outline rounded-xl font-body font-semibold min-h-12 px-8 w-full sm:w-auto border-base-300"
            >
              Go to your church
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default async function HomePage() {
  const tenant = await getTenant();
  if (!tenant) {
    return <ComingSoonView />;
  }

  const [church, limits] = await Promise.all([
    getChurchById(tenant.churchId),
    getTenantLimits(tenant.churchId),
  ]);
  if (!church) {
    return <ComingSoonView />;
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const programs = await getPublishedProgramsWithCoursesAndClasses(tenant.churchId);
  const enrolledClassIds = user
    ? await getEnrolledClassIdsForStudent(tenant.churchId, user.id)
    : new Set<string>();

  return (
    <LearningHub
      church={{
        name: church.name,
        logoUrl: church.logoUrl,
        primaryColor: church.primaryColor,
        secondaryColor: church.secondaryColor ?? null,
        bannerType: church.bannerType ?? null,
        bannerImageUrl: church.bannerImageUrl ?? null,
        bannerColor: church.bannerColor ?? null,
      }}
      customBranding={limits.customBranding}
      programs={programs as Parameters<typeof LearningHub>[0]["programs"]}
      enrolledClassIds={enrolledClassIds}
      userId={user?.id ?? null}
    />
  );
}
