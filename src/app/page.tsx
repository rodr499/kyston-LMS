import { getTenant } from "@/lib/tenant";
import { getChurchById } from "@/lib/db/queries/churches";
import { getPublishedProgramsWithCoursesAndClasses } from "@/lib/db/queries/programs";
import { getEnrolledClassIdsForStudent } from "@/lib/db/queries/enrollments";
import { createClient } from "@/lib/supabase/server";
import MarketingLanding from "@/components/marketing/MarketingLanding";
import LearningHub from "@/components/tenant/LearningHub";

export default async function HomePage() {
  const tenant = await getTenant();
  if (!tenant) {
    return <MarketingLanding />;
  }

  const church = await getChurchById(tenant.churchId);
  if (!church) {
    return <MarketingLanding />;
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
      }}
      programs={programs as Parameters<typeof LearningHub>[0]["programs"]}
      enrolledClassIds={enrolledClassIds}
      userId={user?.id ?? null}
    />
  );
}
