import { NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@/lib/db";
import { churches } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: Request) {
  const key = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!key || !webhookSecret) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  }
  const stripe = new Stripe(key, { apiVersion: "2025-02-24.acacia" });
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }
  if (event.type === "customer.subscription.created" || event.type === "customer.subscription.updated") {
    const sub = event.data.object as Stripe.Subscription;
    const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
    const [church] = await db.select().from(churches).where(eq(churches.stripeCustomerId, customerId)).limit(1);
    if (church) {
      await db.update(churches).set({
        stripeSubscriptionId: sub.id,
        plan: (sub.items.data[0]?.price?.lookup_key as "free" | "pro" | "unlimited") ?? church.plan,
        updatedAt: new Date(),
      }).where(eq(churches.id, church.id));
    }
  }
  if (event.type === "customer.subscription.deleted") {
    const sub = event.data.object as Stripe.Subscription;
    await db.update(churches).set({
      stripeSubscriptionId: null,
      plan: "free",
      updatedAt: new Date(),
    }).where(eq(churches.stripeSubscriptionId, sub.id));
  }
  return NextResponse.json({ received: true });
}
