import { getTenant } from "@/lib/tenant";
import { db } from "@/lib/db";
import { churchIntegrations } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { Video } from "lucide-react";

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
    columns: { id: true, platform: true, isActive: true },
  });

  const platforms = [
    { key: "zoom", label: "Zoom" },
    { key: "teams", label: "Microsoft Teams" },
    { key: "google_meet", label: "Google Meet" },
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
        {platforms.map(({ key, label }) => {
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
    </div>
  );
}
