import { redirect } from "next/navigation";
import { getTenant } from "@/lib/tenant";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getChurchBySubdomain } from "@/lib/db/queries/churches";
import { getTenantLimits } from "@/lib/tenant-config";
import AdminSidebar from "@/components/ui/AdminSidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const tenant = await getTenant();
  if (!tenant) redirect("/");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const row = await db.query.users.findFirst({
    where: eq(users.id, user.id),
    columns: { role: true, churchId: true, fullName: true },
  });
  const canAdminTenant =
    (row?.role === "church_admin" || row?.role === "super_admin") &&
    row?.churchId === tenant.churchId;
  if (!canAdminTenant) redirect("/");
  const [church, limits] = await Promise.all([
    getChurchBySubdomain(tenant.subdomain),
    getTenantLimits(tenant.churchId),
  ]);
  const integrationsEnabled = limits.integrationsMode !== "none";

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      <AdminSidebar
        variant="admin"
        user={{ fullName: row.fullName ?? "Admin", role: row.role }}
        churchName={church?.name}
        logoUrl={church?.logoUrl}
        integrationsEnabled={integrationsEnabled}
      />
      <main className="w-full min-h-screen pt-20 md:pt-12 md:ml-64 md:w-[calc(100%-16rem)] pb-6 px-4 sm:px-6 md:pb-10 md:px-12 min-w-0">
        <div className="max-w-5xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
