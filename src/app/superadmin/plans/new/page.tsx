import { redirect } from "next/navigation";
import PlanForm from "../PlanForm";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NewPlanPage() {
  return (
    <div>
      <div className="flex items-center gap-4 mb-8">
        <Link href="/superadmin/plans" className="btn btn-ghost btn-sm rounded-xl">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="font-heading text-3xl font-bold text-base-content">Create New Plan</h1>
          <p className="text-base-content/60 font-body mt-1">Define a new subscription tier.</p>
        </div>
      </div>
      <PlanForm />
    </div>
  );
}
