import { getTenant } from "@/lib/tenant";
import InviteUserForm from "@/components/admin/InviteUserForm";

export default async function InviteUserPage() {
  const tenant = await getTenant();
  if (!tenant) return null;
  return (
    <div>
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-bold text-base-content">Add or invite user</h1>
        <p className="text-base-content/60 font-body mt-1">Add a user to your workspace or send an email invite.</p>
      </div>
      <InviteUserForm churchId={tenant.churchId} />
    </div>
  );
}
