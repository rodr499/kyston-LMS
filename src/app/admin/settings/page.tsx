import { getTenant } from "@/lib/tenant";
import { getChurchById } from "@/lib/db/queries/churches";
import { redirect } from "next/navigation";
import SettingsForm from "@/components/admin/SettingsForm";

export default async function AdminSettingsPage() {
  const tenant = await getTenant();
  if (!tenant) redirect("/");
  const church = await getChurchById(tenant.churchId);
  if (!church) redirect("/");
  return (
    <div>
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-bold text-base-content">Settings</h1>
        <p className="text-base-content/60 font-body mt-1">Church profile and branding.</p>
      </div>
      <SettingsForm
        churchId={church.id}
        initial={{
          name: church.name,
          primaryColor: church.primaryColor,
          subdomain: church.subdomain,
          logoUrl: church.logoUrl,
        }}
      />
    </div>
  );
}
