import { getTenant } from "@/lib/tenant";
import { getTenantLimits } from "@/lib/tenant-config";
import { getChurchById } from "@/lib/db/queries/churches";
import { redirect } from "next/navigation";
import SettingsForm from "@/components/admin/SettingsForm";
import DeleteMyAccount from "@/components/admin/DeleteMyAccount";

export default async function AdminSettingsPage() {
  const tenant = await getTenant();
  if (!tenant) redirect("/");
  const [church, limits] = await Promise.all([
    getChurchById(tenant.churchId),
    getTenantLimits(tenant.churchId),
  ]);
  if (!church) redirect("/");
  return (
    <div>
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-bold text-base-content">Settings</h1>
        <p className="text-base-content/60 font-body mt-1">Church profile and branding.</p>
      </div>
      <SettingsForm
        churchId={church.id}
        customBranding={limits.customBranding}
        initial={{
          name: church.name,
          primaryColor: church.primaryColor,
          subdomain: church.subdomain,
          logoUrl: church.logoUrl,
          secondaryColor: church.secondaryColor ?? null,
          bannerType: (church.bannerType as "gradient" | "color" | "image" | null) ?? null,
          bannerImageUrl: church.bannerImageUrl ?? null,
          bannerColor: church.bannerColor ?? null,
          websiteUrl: church.websiteUrl ?? null,
          facebookUrl: church.facebookUrl ?? null,
          instagramUrl: church.instagramUrl ?? null,
          linkColor: church.linkColor ?? null,
        }}
      />
      <DeleteMyAccount />
    </div>
  );
}
