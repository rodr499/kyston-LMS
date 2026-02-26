import { getTenant } from "@/lib/tenant";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { users, classes as classesTable, enrollments } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Users, ListTodo, ClipboardCheck } from "lucide-react";

export default async function FacilitatorClassPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const tenant = await getTenant();
  if (!tenant) return null;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { id } = await params;
  const cls = await db.query.classes.findFirst({
    where: and(
      eq(classesTable.id, id),
      eq(classesTable.churchId, tenant.churchId)
    ),
    with: {
      course: { columns: { name: true } },
      facilitator: { columns: { fullName: true } },
    },
  });
  if (!cls) notFound();
  const me = await db.query.users.findFirst({
    where: eq(users.id, user.id),
    columns: { role: true },
  });
  if (cls.facilitatorId !== user.id && me?.role !== "church_admin" && me?.role !== "super_admin") notFound();
  const enrolled = await db.query.enrollments.findMany({
    where: and(eq(enrollments.churchId, tenant.churchId), eq(enrollments.classId, id)),
  });

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-bold text-base-content">{cls.name}</h1>
        <p className="text-base-content/60 font-body mt-1">Course: {cls.course?.name}</p>
      </div>
      <div className="flex flex-wrap gap-3 mb-8">
        <Link href={`/facilitator/classes/${id}/students`} className="btn btn-outline btn-primary rounded-xl gap-2 font-body">
          <Users className="w-4 h-4" /> Students
        </Link>
        <Link href={`/facilitator/classes/${id}/activities`} className="btn btn-outline btn-primary rounded-xl gap-2 font-body">
          <ListTodo className="w-4 h-4" /> Activities
        </Link>
        <Link href={`/facilitator/classes/${id}/attendance`} className="btn btn-outline btn-primary rounded-xl gap-2 font-body">
          <ClipboardCheck className="w-4 h-4" /> Attendance
        </Link>
      </div>
      <div className="card bg-white shadow-sm rounded-2xl border border-[#e5e7eb]">
        <div className="card-body">
          <h3 className="font-heading text-lg font-semibold">Enrolled</h3>
          <p className="font-body text-3xl font-bold text-primary">{enrolled.length}</p>
          <p className="text-base-content/60 font-body text-sm">students in this class</p>
        </div>
      </div>
    </div>
  );
}
