import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import Link from "next/link";
import CreateTenantForm from "./CreateTenantForm";

export default async function NewTenantPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const me = await db.query.users.findFirst({
    where: eq(users.id, user.id),
    columns: { role: true },
  });
  if (me?.role !== "super_admin") redirect("/");

  return (
    <div>
      <div className="mb-8 flex items-center gap-4">
        <Link href="/superadmin/tenants" className="btn btn-ghost btn-sm rounded-xl font-body">← Tenants</Link>
        <h1 className="font-heading text-3xl font-bold text-base-content">Create tenant</h1>
      </div>
      <p className="text-base-content/60 font-body mb-6 max-w-xl">Add a new church (tenant) and its admin user. The admin can sign in at their subdomain.</p>
      <CreateTenantForm />
    </div>
  );
}
