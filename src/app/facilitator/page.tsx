import { getTenant } from "@/lib/tenant";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { users, classes } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import Link from "next/link";
import { CalendarDays, GraduationCap } from "lucide-react";

export default async function FacilitatorDashboard() {
  const tenant = await getTenant();
  if (!tenant) return null;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const myClasses = await db.query.classes.findMany({
    where: and(
      eq(classes.churchId, tenant.churchId),
      eq(classes.facilitatorId, user.id)
    ),
    columns: { id: true, name: true, isPublished: true },
  });
  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  })();

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-bold text-base-content">{greeting} 👋</h1>
        <p className="text-base-content/60 font-body mt-1">Your assigned classes.</p>
      </div>
      {myClasses.length === 0 ? (
        <div className="card bg-white shadow-sm rounded-2xl border border-[#e5e7eb]">
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
              <CalendarDays className="w-10 h-10 text-primary/60" />
            </div>
            <h3 className="font-heading text-xl font-semibold text-base-content mb-2">No classes assigned</h3>
            <p className="font-body text-base-content/50 text-sm max-w-xs">
              You are not assigned to any classes yet. Ask your church admin to assign you.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {myClasses.map((c) => (
            <Link
              key={c.id}
              href={`/facilitator/classes/${c.id}`}
              className="card bg-white shadow-sm rounded-2xl border border-[#e5e7eb] hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
            >
              <div className="card-body">
                <h2 className="card-title font-heading text-lg font-semibold">{c.name}</h2>
                <p className="text-base-content/70 text-sm font-body">
                  {c.isPublished ? (
                    <span className="badge badge-success badge-sm gap-1">Published</span>
                  ) : (
                    <span className="badge badge-ghost badge-sm">Draft</span>
                  )}
                </p>
                <div className="card-actions justify-end mt-4">
                  <span className="btn btn-primary btn-sm rounded-xl gap-1 font-body">
                    <GraduationCap className="w-4 h-4" /> Open
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
