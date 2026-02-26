import { getTenant } from "@/lib/tenant";
import { db } from "@/lib/db";
import { classes, attendance, users } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { ArrowLeft, ClipboardCheck } from "lucide-react";

export default async function FacilitatorAttendancePage({
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
    where: and(eq(classes.id, id), eq(classes.churchId, tenant.churchId)),
  });
  if (!cls) notFound();
  const me = await db.query.users.findFirst({
    where: eq(users.id, user.id),
    columns: { role: true },
  });
  if (cls.facilitatorId !== user.id && me?.role !== "church_admin" && me?.role !== "super_admin") notFound();
  const records = await db.query.attendance.findMany({
    where: and(eq(attendance.classId, id), eq(attendance.churchId, tenant.churchId)),
    with: { student: { columns: { fullName: true } } },
  });
  return (
    <div>
      <div className="flex items-center gap-4 mb-8">
        <Link href={`/facilitator/classes/${id}`} className="btn btn-ghost btn-sm rounded-xl">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="font-heading text-3xl font-bold text-base-content">Attendance</h1>
          <p className="text-base-content/60 font-body mt-1">{cls.name}</p>
        </div>
      </div>
      <div className="card bg-white shadow-sm rounded-2xl border border-[#e5e7eb] overflow-hidden">
        <div className="card-body p-0">
          <div className="flex items-center gap-3 p-6 border-b border-base-300">
            <ClipboardCheck className="w-6 h-6 text-primary" />
            <h3 className="font-heading text-lg font-semibold">Attendance records</h3>
          </div>
          <div className="table-responsive-card overflow-x-auto">
            <table className="table table-zebra">
              <thead>
                <tr className="bg-base-200 text-base-content/60 text-xs uppercase tracking-widest font-body">
                  <th>Date</th>
                  <th>Student</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr key={r.id} className="hover:bg-base-200 transition-colors">
                    <td data-label="Date" className="font-body">{r.sessionDate}</td>
                    <td data-label="Student" className="font-body font-medium">{r.student?.fullName}</td>
                    <td data-label="Status">
                      <span className="badge badge-primary badge-outline font-body text-xs capitalize">{r.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
