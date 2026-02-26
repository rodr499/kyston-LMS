import { db } from "@/lib/db";
import { platformSettings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const KEY_REGISTRATION_ENABLED = "registration_enabled";

export async function getRegistrationEnabled(): Promise<boolean> {
  try {
    const row = await db.query.platformSettings.findFirst({
      where: eq(platformSettings.key, KEY_REGISTRATION_ENABLED),
    });
    if (!row?.value || typeof row.value !== "object") return true;
    const v = (row.value as { enabled?: boolean }).enabled;
    return v !== false;
  } catch {
    return true; // if table missing or query fails, allow registration
  }
}

export async function setRegistrationEnabled(enabled: boolean): Promise<void> {
  await db
    .insert(platformSettings)
    .values({
      key: KEY_REGISTRATION_ENABLED,
      value: { enabled },
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: platformSettings.key,
      set: { value: { enabled }, updatedAt: new Date() },
    });
}
