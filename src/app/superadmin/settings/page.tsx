import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getRegistrationEnabled } from "@/lib/platform-settings";
import RegistrationToggle from "./RegistrationToggle";

export default async function SuperAdminSettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const me = await db.query.users.findFirst({
    where: eq(users.id, user.id),
    columns: { role: true },
  });
  if (me?.role !== "super_admin") redirect("/");

  const registrationEnabled = await getRegistrationEnabled();

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-bold text-base-content">Platform settings</h1>
        <p className="text-base-content/60 font-body mt-1">Global settings for the LMS.</p>
      </div>
      <div className="card bg-white shadow-sm rounded-2xl border border-[#e5e7eb] max-w-xl">
        <div className="card-body">
          <h2 className="font-heading text-lg font-semibold">Registration</h2>
          <p className="font-body text-sm text-base-content/70">When disabled, new churches cannot register from the public registration page.</p>
          <RegistrationToggle initialEnabled={registrationEnabled} />
        </div>
      </div>
    </div>
  );
}
