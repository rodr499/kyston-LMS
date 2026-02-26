import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { churches, users } from "@/lib/db/schema";
import { createAdminClient } from "@/lib/supabase/admin";
import { getRegistrationEnabled } from "@/lib/platform-settings";
import { eq } from "drizzle-orm";

export async function POST(request: Request) {
  const registrationEnabled = await getRegistrationEnabled();
  if (!registrationEnabled) {
    return NextResponse.json(
      { error: "New church registration is currently disabled." },
      { status: 403 }
    );
  }

  const body = await request.json();
  const {
    churchName,
    subdomain,
    adminEmail,
    adminPassword,
    adminFullName,
  } = body as {
    churchName?: string;
    subdomain?: string;
    adminEmail?: string;
    adminPassword?: string;
    adminFullName?: string;
  };

  if (!churchName || !subdomain || !adminEmail || !adminPassword) {
    const error = "Missing church name, subdomain, email, or password.";
    console.warn("[register-church] 400:", error);
    return NextResponse.json({ error }, { status: 400 });
  }

  const RESERVED_SUBDOMAINS = new Set([
    "admin", "api", "www", "superadmin", "mail", "ftp", "smtp", "pop",
    "app", "dashboard", "login", "register", "billing", "support", "help",
    "status", "static", "assets", "cdn", "dev", "staging", "test",
  ]);

  const cleanSubdomain = subdomain.toLowerCase().replace(/[^a-z0-9-]/g, "").replace(/^-+|-+$/g, "");
  if (!cleanSubdomain || cleanSubdomain.length < 3 || cleanSubdomain.length > 63) {
    console.warn("[register-church] 400: Invalid subdomain length.");
    return NextResponse.json({ error: "Subdomain must be between 3 and 63 characters." }, { status: 400 });
  }
  if (RESERVED_SUBDOMAINS.has(cleanSubdomain)) {
    console.warn("[register-church] 400: Reserved subdomain:", cleanSubdomain);
    return NextResponse.json({ error: "That subdomain is reserved." }, { status: 400 });
  }

  const existing = await db.query.churches.findFirst({
    where: eq(churches.subdomain, cleanSubdomain),
  });
  if (existing) {
    return NextResponse.json(
      { error: "That subdomain is already taken." },
      { status: 409 }
    );
  }

  const [church] = await db
    .insert(churches)
    .values({
      name: churchName,
      subdomain: cleanSubdomain,
      plan: "free",
      isActive: true,
    })
    .returning({ id: churches.id });

  if (!church) {
    return NextResponse.json(
      { error: "Failed to create church." },
      { status: 500 }
    );
  }

  const admin = createAdminClient();
  const { data: newUser, error: authError } = await admin.auth.admin.createUser({
    email: adminEmail,
    password: adminPassword,
    email_confirm: true,
    user_metadata: {
      full_name: adminFullName ?? adminEmail,
      church_id: church.id,
      role: "church_admin",
    },
  });

  if (authError || !newUser.user) {
    await db.delete(churches).where(eq(churches.id, church.id));
    const error = authError?.message ?? "Failed to create admin user.";
    console.warn("[register-church] 400 (auth):", error);
    return NextResponse.json({ error }, { status: 400 });
  }

  await db.insert(users).values({
    id: newUser.user.id,
    churchId: church.id,
    email: adminEmail,
    fullName: adminFullName ?? adminEmail,
    role: "church_admin",
  });

  return NextResponse.json({
    success: true,
    churchId: church.id,
    subdomain: cleanSubdomain,
  });
}
