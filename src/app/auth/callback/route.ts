import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, churches } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";
  const rawChurchId = searchParams.get("church_id") ?? null;

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      const existing = await db.query.users.findFirst({
        where: eq(users.id, data.user.id),
        columns: { id: true },
      });
      if (!existing) {
        // Validate the church_id before trusting it
        let validatedChurchId: string | null = null;
        if (rawChurchId) {
          const church = await db.query.churches.findFirst({
            where: eq(churches.id, rawChurchId),
            columns: { id: true, isActive: true },
          });
          if (church?.isActive) {
            validatedChurchId = church.id;
          }
        }
        // Only assign super_admin if no church context — never based on a missing URL param alone.
        // New super_admin accounts must be created directly via the admin API, not through this callback.
        const role = validatedChurchId ? "student" : "student";
        await db.insert(users).values({
          id: data.user.id,
          churchId: validatedChurchId,
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
