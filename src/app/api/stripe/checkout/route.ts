import { NextResponse } from "next/server";
import { getTenant } from "@/lib/tenant";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { users, churches } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import Stripe from "stripe";

export async function GET() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  const stripe = new Stripe(key, { apiVersion: "2025-02-24.acacia" });
  const tenant = await getTenant();
  if (!tenant) return NextResponse.redirect(new URL("/", process.env.NEXT_PUBLIC_APP_DOMAIN ?? "https://kyston.org"));
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", process.env.NEXT_PUBLIC_APP_DOMAIN ?? "https://kyston.org"));
  const u = await db.query.users.findFirst({
    where: eq(users.id, user.id),
    columns: { role: true, churchId: true },
  });
  if (u?.role !== "church_admin" || u.churchId !== tenant.churchId) {
    return NextResponse.redirect(new URL("/admin", process.env.NEXT_PUBLIC_APP_DOMAIN ?? "https://kyston.org"));
  }
  const church = await db.query.churches.findFirst({
    where: eq(churches.id, tenant.churchId),
    columns: { stripeCustomerId: true },
  });
  let customerId = church?.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      metadata: { churchId: tenant.churchId },
    });
    customerId = customer.id;
    await db.update(churches).set({
      stripeCustomerId: customerId,
      updatedAt: new Date(),
    }).where(eq(churches.id, tenant.churchId));
  }
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: process.env.STRIPE_PRICE_PRO ?? "price_xxx", quantity: 1 }],
    success_url: `${process.env.NEXT_PUBLIC_APP_DOMAIN ?? "https://kyston.org"}/admin/billing?success=1`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_DOMAIN ?? "https://kyston.org"}/admin/billing`,
  });
  if (session.url) return NextResponse.redirect(session.url);
  return NextResponse.json({ error: "Checkout failed" }, { status: 500 });
}
