import { NextResponse } from "next/server";
import { getTenant } from "@/lib/tenant";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const BUCKET = "church-assets";
const ALLOWED_TYPES = ["logo", "banner"] as const;
const MAX_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_MIMES = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"];

export async function POST(request: Request) {
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

  const formData = await request.formData();
  const type = formData.get("type") as string | null;
  const file = formData.get("file") as File | null;

  if (!type || !ALLOWED_TYPES.includes(type as (typeof ALLOWED_TYPES)[number])) {
    return NextResponse.json({ error: "Invalid type. Use logo or banner." }, { status: 400 });
  }
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "File required." }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "File too large. Max 2MB." }, { status: 400 });
  }
  if (!ALLOWED_MIMES.includes(file.type)) {
    return NextResponse.json({ error: "Invalid file type. Use JPEG, PNG, WebP, or SVG." }, { status: 400 });
  }

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "png";
  const safeExt = ["jpeg", "jpg", "png", "webp", "svg"].includes(ext) ? ext : "png";
  const path = `${tenant.churchId}/${type}-${Date.now()}.${safeExt}`;

  const admin = createAdminClient();

  // Ensure bucket exists and is public (fixes broken images from private buckets)
  const { data: buckets } = await admin.storage.listBuckets();
  const bucketExists = buckets?.some((b) => b.name === BUCKET);
  if (!bucketExists) {
    await admin.storage.createBucket(BUCKET, { public: true });
  } else {
    await admin.storage.updateBucket(BUCKET, { public: true });
  }

  const { data, error } = await admin.storage.from(BUCKET).upload(path, await file.arrayBuffer(), {
    contentType: file.type,
    upsert: false,
  });

  if (error) {
    return NextResponse.json({ error: error.message ?? "Upload failed" }, { status: 500 });
  }

  if (!data?.path) return NextResponse.json({ error: "Upload failed" }, { status: 500 });

  const { data: urlData } = admin.storage.from(BUCKET).getPublicUrl(data.path);
  return NextResponse.json({ url: urlData.publicUrl });
}
