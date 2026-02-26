"use server";

import { db } from "@/lib/db";
import { churches, users } from "@/lib/db/schema";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

async function requireSuperAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  const me = await db.query.users.findFirst({
    where: eq(users.id, user.id),
    columns: { role: true },
  });
  if (me?.role !== "super_admin") throw new Error("Unauthorized");
  return user.id;
}

export async function createTenantAction(formData: FormData): Promise<{ error?: string; churchId?: string }> {
  await requireSuperAdmin();

  const churchName = String(formData.get("churchName") ?? "").trim();
  const subdomain = String(formData.get("subdomain") ?? "").toLowerCase().replace(/[^a-z0-9-]/g, "");
  const adminEmail = String(formData.get("adminEmail") ?? "").trim();
  const adminPassword = String(formData.get("adminPassword") ?? "");
  const adminFullName = String(formData.get("adminFullName") ?? "").trim() || adminEmail;

  if (!churchName || !subdomain || !adminEmail || !adminPassword) {
    return { error: "Church name, subdomain, admin email, and password are required." };
  }
  if (adminPassword.length < 6) return { error: "Password must be at least 6 characters." };

  const existing = await db.query.churches.findFirst({
    where: eq(churches.subdomain, subdomain),
  });
  if (existing) return { error: "That subdomain is already taken." };

  const [church] = await db
    .insert(churches)
    .values({
      name: churchName,
      subdomain,
      plan: "free",
      isActive: true,
    })
    .returning({ id: churches.id });

  if (!church) return { error: "Failed to create church." };

  const admin = createAdminClient();
  const { data: newUser, error: authError } = await admin.auth.admin.createUser({
    email: adminEmail,
    password: adminPassword,
    email_confirm: true,
    user_metadata: {
      full_name: adminFullName,
      church_id: church.id,
      role: "church_admin",
    },
  });

  if (authError || !newUser.user) {
    await db.delete(churches).where(eq(churches.id, church.id));
    return { error: authError?.message ?? "Failed to create admin user." };
  }

  await db.insert(users).values({
    id: newUser.user.id,
    churchId: church.id,
    email: adminEmail,
    fullName: adminFullName,
    role: "church_admin",
  });

  revalidatePath("/superadmin/tenants");
  revalidatePath("/superadmin");
  return { churchId: church.id };
}

export async function setTenantActiveAction(churchId: string, isActive: boolean): Promise<{ error?: string }> {
  await requireSuperAdmin();
  await db.update(churches).set({ isActive, updatedAt: new Date() }).where(eq(churches.id, churchId));
  revalidatePath("/superadmin/tenants");
  revalidatePath(`/superadmin/tenants/${churchId}`);
  return {};
}

export async function deleteTenantAction(churchId: string): Promise<{ error?: string }> {
  await requireSuperAdmin();

  const churchUsers = await db.query.users.findMany({
    where: eq(users.churchId, churchId),
    columns: { id: true },
  });

  const admin = createAdminClient();
  for (const u of churchUsers) {
    try {
      await admin.auth.admin.deleteUser(u.id);
    } catch {
      // continue; user may already be deleted
    }
  }

  await db.delete(churches).where(eq(churches.id, churchId));
  revalidatePath("/superadmin/tenants");
  revalidatePath("/superadmin");
  return {};
}
