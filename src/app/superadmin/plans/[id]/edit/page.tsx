import { db } from "@/lib/db";
import { plans } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import PlanForm from "../../PlanForm";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function EditPlanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const plan = await db.query.plans.findFirst({
    where: eq(plans.id, id),
  });
  if (!plan) notFound();

  return (
    <div>
      <div className="flex items-center gap-4 mb-8">
        <Link href="/superadmin/plans" className="btn btn-ghost btn-sm rounded-xl">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="font-heading text-3xl font-bold text-base-content">Edit Plan</h1>
          <p className="text-base-content/60 font-body mt-1">{plan.name}</p>
        </div>
      </div>
      <PlanForm plan={plan} />
    </div>
  );
}
