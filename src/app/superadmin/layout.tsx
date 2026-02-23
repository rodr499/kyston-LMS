import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import AdminSidebar from "@/components/ui/AdminSidebar";

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const row = await db.query.users.findFirst({
    where: eq(users.id, user.id),
    columns: { role: true, churchId: true, fullName: true },
  });
  if (row?.role !== "super_admin" || row.churchId != null) redirect("/");
  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      <AdminSidebar
        variant="superadmin"
        user={{ fullName: row.fullName ?? "Super Admin", role: row.role }}
      />
      <main className="w-full min-h-screen pt-20 md:pt-12 md:ml-64 md:w-[calc(100%-16rem)] pb-6 px-4 sm:px-6 md:pb-8 md:px-8 min-w-0">{children}</main>
    </div>
  );
}
