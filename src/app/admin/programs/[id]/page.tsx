import { getTenant } from "@/lib/tenant";
import { db } from "@/lib/db";
import { programs } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import ProgramForm from "@/components/admin/ProgramForm";
import { GraduationCap } from "lucide-react";

export default async function ProgramDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const tenant = await getTenant();
  if (!tenant) return null;
  const { id } = await params;
  const program = await db.query.programs.findFirst({
    where: and(eq(programs.id, id), eq(programs.churchId, tenant.churchId)),
  });
  if (!program) notFound();
  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="font-heading text-3xl font-bold text-base-content">Edit program</h1>
          <p className="text-base-content/60 font-body mt-1">{program.name}</p>
        </div>
        <Link href={`/admin/programs/${id}/courses`} className="btn btn-outline btn-primary rounded-xl gap-2 font-body">
          <GraduationCap className="w-4 h-4" /> Courses
        </Link>
      </div>
      <ProgramForm
        churchId={tenant.churchId}
        initial={{
          id: program.id,
          name: program.name,
          description: program.description ?? "",
          isPublished: program.isPublished,
        }}
      />
    </div>
  );
}
