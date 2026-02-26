import { NextResponse } from "next/server";
import { getTenant } from "@/lib/tenant";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { users, courses, classes } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

const ALLOWED_TABLES = ["courses", "classes"] as const;
type AllowedTable = (typeof ALLOWED_TABLES)[number];

export async function PATCH(request: Request) {
  const tenant = await getTenant();
  if (!tenant) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const u = await db.query.users.findFirst({
    where: eq(users.id, user.id),
    columns: { role: true, churchId: true },
  });
  const canAdmin = (u?.role === "church_admin" || u?.role === "super_admin") && u?.churchId === tenant.churchId;
  if (!canAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json() as { table: string; items: { id: string }[] };
  const { table, items } = body;

  if (!ALLOWED_TABLES.includes(table as AllowedTable) || !Array.isArray(items)) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const tableRef = table === "courses" ? courses : classes;

  await Promise.all(
    items.map((item, index) =>
      db
        .update(tableRef)
        .set({ sortOrder: index })
        .where(and(eq(tableRef.id, item.id), eq(tableRef.churchId, tenant.churchId)))
    )
  );

  return NextResponse.json({ ok: true });
}
