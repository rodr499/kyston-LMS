import { NextResponse } from "next/server";
import { getTenant } from "@/lib/tenant";
import { getTenantLimits } from "@/lib/tenant-config";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { users, churches } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

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

  const body = await request.json();
  const {
    churchId,
    name,
    primaryColor,
    logoUrl,
    secondaryColor,
    bannerType,
    bannerImageUrl,
    bannerColor,
    websiteUrl,
    facebookUrl,
    instagramUrl,
    linkColor,
  } = body as {
    churchId: string;
    name?: string;
    primaryColor?: string;
    logoUrl?: string | null;
    secondaryColor?: string | null;
    bannerType?: string | null;
    bannerImageUrl?: string | null;
    bannerColor?: string | null;
    websiteUrl?: string | null;
    facebookUrl?: string | null;
    instagramUrl?: string | null;
    linkColor?: string | null;
  };

  if (churchId !== tenant.churchId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const limits = await getTenantLimits(tenant.churchId);
  if (!limits.customBranding) {
    if (logoUrl !== undefined) {
      return NextResponse.json(
        { error: "Custom branding (logo) requires a paid plan." },
        { status: 403 }
      );
    }
    if (secondaryColor !== undefined || linkColor !== undefined || bannerType !== undefined || bannerImageUrl !== undefined || bannerColor !== undefined) {
      return NextResponse.json(
        { error: "Custom branding requires a paid plan." },
        { status: 403 }
      );
    }
  }

  await db
    .update(churches)
    .set({
      ...(name != null && { name }),
      ...(primaryColor != null && { primaryColor }),
      ...(limits.customBranding && logoUrl !== undefined && { logoUrl: logoUrl ?? null }),
      ...(limits.customBranding && secondaryColor !== undefined && { secondaryColor: secondaryColor ?? null }),
      ...(limits.customBranding && linkColor !== undefined && { linkColor: linkColor ?? null }),
      ...(limits.customBranding && bannerType !== undefined && { bannerType: bannerType ?? null }),
      ...(limits.customBranding && bannerImageUrl !== undefined && { bannerImageUrl: bannerImageUrl ?? null }),
      ...(limits.customBranding && bannerColor !== undefined && { bannerColor: bannerColor ?? null }),
      ...(websiteUrl !== undefined && { websiteUrl: websiteUrl ?? null }),
      ...(facebookUrl !== undefined && { facebookUrl: facebookUrl ?? null }),
      ...(instagramUrl !== undefined && { instagramUrl: instagramUrl ?? null }),
      updatedAt: new Date(),
    })
    .where(eq(churches.id, churchId));
  return NextResponse.json({ ok: true });
}
