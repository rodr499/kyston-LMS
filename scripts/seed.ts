/**
 * Seed script: run with pnpm exec tsx scripts/seed.ts
 * Requires DATABASE_URL, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY in .env.local or .env.
 * Creates: 1 super_admin (auth user + users row), 1 church, 1 church_admin, 2 facilitators, 3 students,
 * 2 programs, 2 courses, 2 classes, enrollments, 2 activities, sample attendance.
 */
import { config } from "dotenv";

// Load .env.local (Next.js) then .env so seed sees Supabase and DB vars
config({ path: ".env.local" });
config();

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { createClient } from "@supabase/supabase-js";
import { and, eq } from "drizzle-orm";
import * as schema from "../src/lib/db/schema";

const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString, { max: 1 });
const db = drizzle(client, { schema });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

async function seed() {
  const email = process.env.SEED_SUPERADMIN_EMAIL ?? "superadmin@kyston.org";
  const password = process.env.SEED_SUPERADMIN_PASSWORD ?? "superadmin-secure-change-me";

  const { data: superUser, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  const emailExists = createError?.code === "email_exists" || createError?.message?.toLowerCase().includes("already been registered");
  if (createError && !emailExists) {
    console.error("Create super admin user:", createError);
    throw createError;
  }
  let superUserId = superUser?.user?.id;
  if (!superUserId && (createError || !superUser)) {
    const { data: existing } = await admin.auth.admin.listUsers();
    const found = existing.users.find((u) => u.email === email);
    superUserId = found?.id;
  }
  if (!superUserId) throw new Error("Could not get or create super admin user");

  await db.insert(schema.users).values({
    id: superUserId,
    churchId: null,
    email,
    fullName: "Super Admin",
    role: "super_admin",
  }).onConflictDoUpdate({
    target: schema.users.id,
    set: { role: "super_admin", churchId: null, updatedAt: new Date() },
  });

  const [freePlan] = await db.insert(schema.plans).values({
    name: "Free",
    slug: "free",
    description: "Get started with basic features",
    isPublic: true,
    isActive: true,
    maxFacilitators: 3,
    maxStudents: 20,
    maxPrograms: 2,
    maxCourses: 5,
    maxStorageMb: 500,
    integrationsMode: "none",
    allowedIntegrations: [],
    sortOrder: 0,
  }).returning({ id: schema.plans.id }).onConflictDoUpdate({
    target: schema.plans.slug,
    set: { name: "Free", updatedAt: new Date() },
  });

  const [proPlan] = await db.insert(schema.plans).values({
    name: "Pro",
    slug: "pro",
    description: "For growing churches",
    isPublic: true,
    isActive: true,
    priceMonthly: "29.00",
    priceYearly: "290.00",
    maxFacilitators: 10,
    maxStudents: 200,
    maxPrograms: 20,
    maxCourses: 50,
    maxStorageMb: 5120,
    integrationsMode: "auto",
    allowedIntegrations: ["zoom", "teams", "google_meet"],
    customBranding: true,
    certificates: true,
    sortOrder: 1,
  }).returning({ id: schema.plans.id }).onConflictDoUpdate({
    target: schema.plans.slug,
    set: { name: "Pro", updatedAt: new Date() },
  });

  const [unlimitedPlan] = await db.insert(schema.plans).values({
    name: "Unlimited",
    slug: "unlimited",
    description: "For large organizations",
    isPublic: true,
    isActive: true,
    priceMonthly: "99.00",
    priceYearly: "990.00",
    maxFacilitators: -1,
    maxStudents: -1,
    maxPrograms: -1,
    maxCourses: -1,
    maxStorageMb: 51200,
    integrationsMode: "auto",
    allowedIntegrations: ["zoom", "teams", "google_meet"],
    customBranding: true,
    certificates: true,
    smsNotifications: true,
    analytics: true,
    prioritySupport: true,
    sortOrder: 2,
  }).returning({ id: schema.plans.id }).onConflictDoUpdate({
    target: schema.plans.slug,
    set: { name: "Unlimited", updatedAt: new Date() },
  });

  const [church] = await db.insert(schema.churches).values({
    name: "Grace Church",
    subdomain: "gracechurch",
    plan: "free",
    isActive: true,
  }).returning({ id: schema.churches.id });
  if (!church) throw new Error("Failed to create church");
  const churchId = church.id;

  await db.insert(schema.churchPlanConfig).values({
    churchId,
    planId: freePlan?.id ?? null,
    isManualOverride: false,
  }).onConflictDoUpdate({
    target: schema.churchPlanConfig.churchId,
    set: { planId: freePlan?.id ?? undefined, updatedAt: new Date() },
  });

  const adminEmail = process.env.SEED_CHURCH_ADMIN_EMAIL ?? "admin@gracechurch.org";
  const adminPassword = process.env.SEED_CHURCH_ADMIN_PASSWORD ?? "admin-secure-change-me";
  const { data: adminUser, error: adminError } = await admin.auth.admin.createUser({
    email: adminEmail,
    password: adminPassword,
    email_confirm: true,
  });
  let churchAdminId = adminUser?.user?.id;
  if (!churchAdminId && (adminError?.code === "email_exists" || adminError?.message?.toLowerCase().includes("already been registered"))) {
    const { data: list } = await admin.auth.admin.listUsers();
    churchAdminId = list.users.find((u) => u.email === adminEmail)?.id ?? undefined;
  } else if (adminError) {
    console.error("Create church admin user:", adminError);
    throw adminError;
  }
  if (churchAdminId) {
    await db.insert(schema.users).values({
      id: churchAdminId,
      churchId,
      email: adminEmail,
      fullName: "Church Admin",
      role: "church_admin",
    }).onConflictDoUpdate({
      target: schema.users.id,
      set: { churchId, role: "church_admin", updatedAt: new Date() },
    });
  }

  if (superUserId && proPlan?.id) {
    const [coupon1] = await db.insert(schema.couponCodes).values({
      code: "GRACE2026",
      description: "Launch discount for Grace Church",
      grantType: "plan",
      grantPlanId: proPlan.id,
      durationType: "months",
      durationValue: 6,
      maxRedemptions: 1,
      isActive: true,
      createdBy: superUserId,
    }).returning({ id: schema.couponCodes.id }).onConflictDoUpdate({
      target: schema.couponCodes.code,
      set: { updatedAt: new Date() },
    });

    await db.insert(schema.couponCodes).values({
      code: "LAUNCH50",
      description: "50% off first year",
      grantType: "manual_config",
      grantMaxFacilitators: 5,
      grantMaxStudents: 100,
      grantMaxPrograms: 10,
      grantIntegrationsMode: "auto",
      grantAllowedIntegrations: ["zoom"],
      durationType: "permanent",
      maxRedemptions: 10,
      isActive: true,
      createdBy: superUserId,
    }).onConflictDoUpdate({
      target: schema.couponCodes.code,
      set: { updatedAt: new Date() },
    });

    const existingRedemption = coupon1?.id
      ? await db.select().from(schema.couponRedemptions).where(
          and(eq(schema.couponRedemptions.churchId, churchId), eq(schema.couponRedemptions.couponId, coupon1.id))
        )
      : [];
    if (coupon1?.id && churchAdminId && existingRedemption.length === 0) {
      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + 6);
      await db.insert(schema.couponRedemptions).values({
        couponId: coupon1.id,
        churchId,
        redeemedBy: churchAdminId,
        redeemedAt: new Date(),
        expiresAt,
        isActive: true,
      });
    }
  }

  const fac1Email = "fac1@gracechurch.org";
  const { data: fac1, error: fac1Error } = await admin.auth.admin.createUser({
    email: fac1Email,
    password: "fac1-secure-change-me",
    email_confirm: true,
  });
  let fac1Id = fac1?.user?.id;
  if (!fac1Id && (fac1Error?.code === "email_exists" || fac1Error?.message?.toLowerCase().includes("already been registered"))) {
    const { data: list } = await admin.auth.admin.listUsers();
    fac1Id = list.users.find((u) => u.email === fac1Email)?.id ?? undefined;
  } else if (fac1Error) {
    console.error("Create facilitator user:", fac1Error);
    throw fac1Error;
  }
  if (fac1Id) {
    await db.insert(schema.users).values({
      id: fac1Id,
      churchId,
      email: fac1Email,
      fullName: "Facilitator One",
      role: "facilitator",
    }).onConflictDoUpdate({
      target: schema.users.id,
      set: { churchId, role: "facilitator", updatedAt: new Date() },
    });
  }

  const [program1] = await db.insert(schema.programs).values({
    churchId,
    name: "Discipleship",
    description: "Core discipleship program",
    isPublished: true,
  }).returning({ id: schema.programs.id });
  if (!program1) throw new Error("Failed to create program");
  const [course1] = await db.insert(schema.courses).values({
    churchId,
    programId: program1.id,
    name: "Foundations",
    isPublished: true,
  }).returning({ id: schema.courses.id });
  if (!course1) throw new Error("Failed to create course");
  const [class1] = await db.insert(schema.classes).values({
    churchId,
    courseId: course1.id,
    name: "Fall 2025",
    facilitatorId: fac1Id ?? null,
    allowSelfEnrollment: true,
    isPublished: true,
  }).returning({ id: schema.classes.id });
  if (!class1) throw new Error("Failed to create class");

  const studentEmail = "student@gracechurch.org";
  const { data: studentUser, error: studentError } = await admin.auth.admin.createUser({
    email: studentEmail,
    password: "student-secure-change-me",
    email_confirm: true,
  });
  let studentId = studentUser?.user?.id;
  if (!studentId && (studentError?.code === "email_exists" || studentError?.message?.toLowerCase().includes("already been registered"))) {
    const { data: list } = await admin.auth.admin.listUsers();
    studentId = list.users.find((u) => u.email === studentEmail)?.id ?? undefined;
  } else if (studentError) {
    console.error("Create student user:", studentError);
    throw studentError;
  }
  if (studentId) {
    await db.insert(schema.users).values({
      id: studentId,
      churchId,
      email: studentEmail,
      fullName: "Student One",
      role: "student",
    }).onConflictDoUpdate({
      target: schema.users.id,
      set: { churchId, role: "student", updatedAt: new Date() },
    });
    await db.insert(schema.enrollments).values({
      churchId,
      classId: class1.id,
      studentId,
      status: "enrolled",
      enrolledAt: new Date(),
    }).onConflictDoNothing();
  }

  await db.insert(schema.activities).values([
    {
      churchId,
      classId: class1.id,
      title: "Welcome",
      type: "content_article",
      content: { html: "<p>Welcome to the class.</p>" },
      orderIndex: 0,
      isRequired: true,
      points: 0,
    },
    {
      churchId,
      classId: class1.id,
      title: "Acknowledgment",
      type: "acknowledgment",
      content: { statement: "I agree to participate fully." },
      orderIndex: 1,
      isRequired: true,
      points: 0,
    },
  ]);

  if (studentId) {
    await db.insert(schema.attendance).values({
      churchId,
      classId: class1.id,
      studentId,
      sessionDate: new Date().toISOString().slice(0, 10),
      status: "present",
    });
  }

  console.log("Seed complete.");
  console.log("Super admin:", email);
  console.log("Church: Grace Church (gracechurch)");
  console.log("Church admin:", adminEmail);
  console.log("Facilitator:", fac1Email);
  console.log("Student:", studentEmail);
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
}).finally(() => process.exit(0));
