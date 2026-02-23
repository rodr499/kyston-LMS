import { getTenant } from "@/lib/tenant";
import { db } from "@/lib/db";
import { classes, activities, users } from "@/lib/db/schema";
import { and, eq, asc } from "drizzle-orm";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { ArrowLeft, ListTodo } from "lucide-react";

export default async function FacilitatorActivitiesPage({
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
  if (cls.facilitatorId !== user.id && me?.role !== "church_admin") notFound();
  const list = await db.query.activities.findMany({
    where: and(eq(activities.classId, id), eq(activities.churchId, tenant.churchId)),
    orderBy: [asc(activities.orderIndex)],
    columns: { id: true, title: true, type: true, orderIndex: true, isRequired: true, points: true },
  });
  return (
    <div>
      <div className="flex items-center gap-4 mb-8">
        <Link href={`/facilitator/classes/${id}`} className="btn btn-ghost btn-sm rounded-xl">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="font-heading text-3xl font-bold text-base-content">Activities</h1>
          <p className="text-base-content/60 font-body mt-1">{cls.name}. Add and reorder from Admin.</p>
        </div>
      </div>
      <div className="card bg-white shadow-sm rounded-2xl border border-[#e5e7eb] overflow-hidden">
        <div className="card-body p-0">
          <div className="flex items-center gap-3 p-6 border-b border-base-300">
            <ListTodo className="w-6 h-6 text-primary" />
            <h3 className="font-heading text-lg font-semibold">Activity list</h3>
          </div>
          <div className="table-responsive-card overflow-x-auto">
            <table className="table table-zebra">
              <thead>
                <tr className="bg-base-200 text-base-content/60 text-xs uppercase tracking-widest font-body">
                  <th>Order</th>
                  <th>Title</th>
                  <th>Type</th>
                  <th>Required</th>
                  <th>Points</th>
                </tr>
              </thead>
              <tbody>
                {list.map((a) => (
                  <tr key={a.id} className="hover:bg-base-200 transition-colors">
                    <td data-label="Order" className="font-body font-medium">{a.orderIndex}</td>
                    <td data-label="Title" className="font-body">{a.title}</td>
                    <td data-label="Type">
                      <span className="badge badge-secondary badge-outline font-body text-xs capitalize">{a.type}</span>
                    </td>
                    <td data-label="Required" className="font-body">{a.isRequired ? "Yes" : "No"}</td>
                    <td data-label="Points" className="font-body">{a.points}</td>
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
