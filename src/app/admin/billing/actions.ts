"use server";

import { db } from "@/lib/db";
import { couponCodes, couponRedemptions } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { createClient } from "@/lib/supabase/server";
import { users } from "@/lib/db/schema";
import { revalidatePath } from "next/cache";

export async function redeemCoupon(churchId: string, code: string): Promise<{ message: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("You must be logged in to redeem a code");
  const me = await db.query.users.findFirst({
    where: eq(users.id, user.id),
    columns: { role: true, churchId: true },
  });
  const canAdmin = (me?.role === "church_admin" || me?.role === "super_admin") && me?.churchId === churchId;
  if (!canAdmin) throw new Error("Only church admins can redeem codes for their church");

  const normalized = code.trim().toUpperCase();
  if (!normalized) throw new Error("Please enter a code");

  const coupon = await db.query.couponCodes.findFirst({
    where: eq(couponCodes.code, normalized),
  });
  if (!coupon) throw new Error("Invalid code");
  if (!coupon.isActive) throw new Error("This code is no longer active");
  if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
    throw new Error("This code has expired");
  }
  if (coupon.maxRedemptions != null && (coupon.currentRedemptions ?? 0) >= coupon.maxRedemptions) {
    throw new Error("This code has reached its redemption limit");
  }

  const existing = await db.query.couponRedemptions.findFirst({
    where: and(
      eq(couponRedemptions.couponId, coupon.id),
      eq(couponRedemptions.churchId, churchId),
      eq(couponRedemptions.isActive, true)
    ),
  });
  if (existing) throw new Error("Your church has already redeemed this code");

  let expiresAt: Date | null = null;
  if (coupon.durationType === "days" && coupon.durationValue) {
    expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + coupon.durationValue);
  } else if (coupon.durationType === "months" && coupon.durationValue) {
    expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + coupon.durationValue);
  }

  await db.insert(couponRedemptions).values({
    couponId: coupon.id,
    churchId,
    redeemedBy: user.id,
    redeemedAt: new Date(),
    expiresAt,
    isActive: true,
  });

  await db
    .update(couponCodes)
    .set({
      currentRedemptions: (coupon.currentRedemptions ?? 0) + 1,
      updatedAt: new Date(),
    })
    .where(eq(couponCodes.id, coupon.id));

  revalidatePath("/admin/billing");

  const expiryStr = expiresAt ? ` Access expires ${expiresAt.toLocaleDateString()}.` : "";
  return { message: `Code redeemed successfully!${expiryStr}` };
}
