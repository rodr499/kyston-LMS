import { redirect } from "next/navigation";
import { getTenant } from "@/lib/tenant";
import { checkLimit } from "@/lib/tenant-config";
import ProgramForm from "@/components/admin/ProgramForm";

export default async function NewProgramPage() {
  const tenant = await getTenant();
  if (!tenant) redirect("/");
  const { allowed } = await checkLimit(tenant.churchId, "programs");
  if (!allowed) {
    return (
      <div className="alert alert-warning rounded-xl border border-warning/30 shadow-sm">
        <span className="font-body">Program limit reached for your plan. Upgrade to add more.</span>
      </div>
    );
  }
  return (
    <div>
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-bold text-base-content">New program</h1>
        <p className="text-base-content/60 font-body mt-1">Create a new learning program for your church.</p>
      </div>
      <ProgramForm churchId={tenant.churchId} />
    </div>
  );
}
