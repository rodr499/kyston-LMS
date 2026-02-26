"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/** Church admin only. Deletes their own user row and Supabase auth user. Caller must sign out and redirect after. */
export async function deleteMyAccountAction(): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const row = await db.query.users.findFirst({
    where: eq(users.id, user.id),
    columns: { role: true, churchId: true },
  });
  if (row?.role !== "church_admin" && row?.role !== "super_admin") return { error: "Only church admins can delete their own account here." };

  const admin = createAdminClient();
  try {
    await admin.auth.admin.deleteUser(user.id);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to delete auth account." };
  }

  await db.delete(users).where(eq(users.id, user.id));
  return {};
}
