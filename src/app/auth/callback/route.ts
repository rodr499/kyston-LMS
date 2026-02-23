import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";
  const churchId = searchParams.get("church_id") ?? null;

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      const existing = await db.query.users.findFirst({
        where: eq(users.id, data.user.id),
      });
      if (!existing) {
        const role = churchId ? "student" : "super_admin";
        await db.insert(users).values({
          id: data.user.id,
          churchId: churchId || null,
          email: data.user.email ?? "",
          fullName: data.user.user_metadata?.full_name ?? data.user.email ?? "User",
          avatarUrl: data.user.user_metadata?.avatar_url ?? null,
          role,
        }).onConflictDoNothing();
      }
      return NextResponse.redirect(origin + next);
    }
  }

  return NextResponse.redirect(origin + "/login?error=auth");
}
