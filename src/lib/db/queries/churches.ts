import { db } from "@/lib/db";
import { churches } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function getChurchById(id: string) {
  const row = await db.query.churches.findFirst({
    where: eq(churches.id, id),
  });
  return row ?? null;
}

export async function getChurchBySubdomain(subdomain: string) {
  const row = await db.query.churches.findFirst({
    where: eq(churches.subdomain, subdomain),
  });
  return row ?? null;
}
