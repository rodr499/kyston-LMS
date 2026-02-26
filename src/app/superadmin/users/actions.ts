"use server";

import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

/** Promote a user to super_admin. They keep their churchId so they remain admin of their tenant. Only callable by super_admin. */
export async function promoteToSuperAdmin(userId: string, tenantId?: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const me = await db.query.users.findFirst({
    where: eq(users.id, user.id),
    columns: { role: true },
  });
  if (me?.role !== "super_admin") return { error: "Only super admins can promote users." };

  const target = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { id: true, role: true },
  });
  if (!target) return { error: "User not found." };
  if (target.role === "super_admin") return { error: "User is already a super admin." };

  await db
    .update(users)
    .set({ role: "super_admin", updatedAt: new Date() })
    .where(eq(users.id, userId));

  revalidatePath("/superadmin/users");
  revalidatePath("/superadmin");
  if (tenantId) revalidatePath(`/superadmin/tenants/${tenantId}`);
  return {};
}
