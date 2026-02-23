import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getChurchById } from "@/lib/db/queries/churches";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const row = await db.query.users.findFirst({
    where: eq(users.id, user.id),
    columns: { id: true, role: true, churchId: true, fullName: true, email: true },
  });
  if (!row) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  let subdomain: string | null = null;
  if (row.churchId) {
    const church = await getChurchById(row.churchId);
    subdomain = church?.subdomain ?? null;
  }
  return NextResponse.json({
    id: row.id,
    role: row.role,
    churchId: row.churchId,
    subdomain,
    fullName: row.fullName,
    email: row.email,
  });
}
