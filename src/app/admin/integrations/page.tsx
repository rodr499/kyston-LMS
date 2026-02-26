import { getTenant } from "@/lib/tenant";
import { db } from "@/lib/db";
import { churchIntegrations } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { Video } from "lucide-react";
import Sync365FacilitatorsForm from "@/components/admin/Sync365FacilitatorsForm";
import TeamsCalendarPicker from "@/components/admin/TeamsCalendarPicker";

const ERROR_MESSAGES: Record<string, string> = {
  teams_not_configured: "Microsoft Teams is not configured. Add MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET to your environment.",
  zoom_not_configured: "Zoom is not configured. Add ZOOM_CLIENT_ID and ZOOM_CLIENT_SECRET to your environment.",
  google_not_configured: "Google Meet is not configured. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to your environment.",
  zoom_token: "Zoom authorization failed. Please try again.",
  teams_token: "Microsoft Teams authorization failed. Please try again.",
  google_token: "Google authorization failed. Please try again.",
};

export default async function AdminIntegrationsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const tenant = await getTenant();
  if (!tenant) return null;
  const { error: errorCode } = await searchParams;
  const list = await db.query.churchIntegrations.findMany({
    where: eq(churchIntegrations.churchId, tenant.churchId),
    columns: { id: true, platform: true, isActive: true, metadata: true },
  });
  const teamsIntegration = list.find((i) => i.platform === "teams" && i.isActive);
  const meta = (teamsIntegration?.metadata as {
    facilitatorGroupId?: string;
    facilitatorGroupIds?: string[];
    groupRoleMappings?: { groupId: string; role: string }[];
  } | null) ?? {};
  let initialGroupRoleMappings: { groupId: string; role: "church_admin" | "facilitator" | "student" }[] = [];
  if (Array.isArray(meta.groupRoleMappings) && meta.groupRoleMappings.length > 0) {
    initialGroupRoleMappings = meta.groupRoleMappings
      .filter(
        (m): m is { groupId: string; role: "church_admin" | "facilitator" | "student" } =>
          typeof m?.groupId === "string" &&
          m.groupId.trim().length > 0 &&
          ["church_admin", "facilitator", "student"].includes(m.role)
      )
      .map((m) => ({ groupId: m.groupId.trim(), role: m.role }));
  } else {
    const ids = Array.isArray(meta.facilitatorGroupIds)
      ? meta.facilitatorGroupIds.filter((id): id is string => typeof id === "string" && id.trim().length > 0)
      : meta.facilitatorGroupId?.trim()
        ? [meta.facilitatorGroupId.trim()]
        : [];
    initialGroupRoleMappings = ids.map((groupId) => ({ groupId, role: "facilitator" as const }));
  }

  const platforms = [
    { key: "zoom", label: "Zoom", hint: null },
    {
      key: "teams",
      label: "Microsoft Teams",
      hint: "Requires a work or school Microsoft 365 account with Teams. Personal accounts (e.g. outlook.com) are not supported by Microsoft’s API.",
    },
    { key: "google_meet", label: "Google Meet", hint: null },
  ] as const;

  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-bold text-base-content">Integrations</h1>
        <p className="text-base-content/60 font-body mt-1 max-w-xl">
          Connect Zoom, Microsoft Teams, or Google Meet to create meetings from classes. Free plan: manual link only. Pro: one platform. Unlimited: all.
        </p>
      </div>
      {errorCode && (
        <div className="alert alert-warning rounded-xl border border-warning/30 mb-6">
          <span className="font-body">{ERROR_MESSAGES[errorCode] ?? `Error: ${errorCode}`}</span>
        </div>
      )}
      <div className="grid gap-6 max-w-2xl">
        {platforms.map(({ key, label, hint }) => {
          const connected = list.find((i) => i.platform === key && i.isActive);
          return (
            <div
              key={key}
              className="card bg-white shadow-sm rounded-2xl border border-[#e5e7eb] hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
            >
              <div className="card-body p-6 flex-row justify-between items-center gap-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Video className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-heading font-semibold text-base-content">{label}</h3>
                    <p className="text-base-content/60 text-sm font-body">Video meetings for live classes</p>
                    {hint && <p className="text-base-content/50 text-xs font-body mt-1">{hint}</p>}
                  </div>
                </div>
                {connected ? (
                  <div className="flex items-center gap-3">
                    <span className="badge badge-success gap-1.5 font-body text-xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-white inline-block" />
                      Connected
                    </span>
                    <a
                      href={`/api/integrations/${key}/connect`}
                      className="btn btn-ghost btn-sm rounded-xl font-body text-primary"
                    >
                      Reconnect
                    </a>
                  </div>
                ) : (
                  <a href={`/api/integrations/${key}/connect`} className="btn btn-primary btn-sm rounded-xl font-body">
                    Connect
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {teamsIntegration && (
        <div className="mt-8 max-w-2xl space-y-8">
          <div className="card bg-white shadow-sm rounded-2xl border border-[#e5e7eb] p-6">
            <h3 className="font-heading text-lg font-semibold text-base-content mb-2">Teams meeting calendar</h3>
            <p className="text-base-content/60 font-body text-sm mb-4">
              Choose which Outlook calendar to use when creating recurring Teams meetings for classes. Leave as &quot;Default calendar&quot; to use your main calendar.
            </p>
            <TeamsCalendarPicker />
          </div>
          <Sync365FacilitatorsForm initialGroupRoleMappings={initialGroupRoleMappings} />
        </div>
      )}
    </div>
  );
}
