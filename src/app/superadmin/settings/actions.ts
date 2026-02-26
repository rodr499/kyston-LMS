"use server";

import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { setRegistrationEnabled, getRegistrationEnabled } from "@/lib/platform-settings";
import { revalidatePath } from "next/cache";

export async function getRegistrationEnabledAction(): Promise<boolean> {
  return getRegistrationEnabled();
}

export async function setRegistrationEnabledAction(enabled: boolean): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };
  const me = await db.query.users.findFirst({
    where: eq(users.id, user.id),
    columns: { role: true },
  });
  if (me?.role !== "super_admin") return { error: "Unauthorized" };
  await setRegistrationEnabled(enabled);
  revalidatePath("/superadmin/settings");
  return {};
}
