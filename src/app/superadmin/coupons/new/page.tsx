import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import CouponForm from "../CouponForm";
import { db } from "@/lib/db";
import { plans } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";

export default async function NewCouponPage() {
  const planList = await db.query.plans.findMany({
    where: eq(plans.isActive, true),
    orderBy: [asc(plans.sortOrder)],
    columns: { id: true, name: true, slug: true },
  });

  return (
    <div>
      <div className="flex items-center gap-4 mb-8">
        <Link href="/superadmin/coupons" className="btn btn-ghost btn-sm rounded-xl">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="font-heading text-3xl font-bold text-base-content">Create New Coupon</h1>
          <p className="text-base-content/60 font-body mt-1">Define a discount or access code.</p>
        </div>
      </div>
      <CouponForm plans={planList} />
    </div>
  );
}
