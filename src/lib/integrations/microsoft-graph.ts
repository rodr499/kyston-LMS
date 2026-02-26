/**
 * Microsoft Graph helpers: get valid Teams token for a church and fetch group members.
 * Used for syncing facilitators from a Microsoft 365 group.
 */
import { db } from "@/lib/db";
import { churchIntegrations } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { teamsProvider } from "./teams-provider";

const MS_TOKEN_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/token";
const GRAPH_BASE = "https://graph.microsoft.com/v1.0";

export type GraphUser = { id: string; displayName: string | null; mail: string | null };

/** Get a valid access token for the church's Teams integration (refreshes if needed). */
export async function getTeamsAccessToken(churchId: string): Promise<string | null> {
  const row = await db.query.churchIntegrations.findFirst({
    where: and(
      eq(churchIntegrations.churchId, churchId),
      eq(churchIntegrations.platform, "teams"),
      eq(churchIntegrations.isActive, true)
    ),
    columns: { id: true, accessToken: true, refreshToken: true, tokenExpiresAt: true },
  });
  if (!row?.accessToken) return null;

  const now = new Date();
  const expiresAt = row.tokenExpiresAt;
  const bufferMs = 5 * 60 * 1000; // refresh if expiring within 5 minutes
  if (expiresAt && expiresAt.getTime() - bufferMs > now.getTime()) {
    return row.accessToken;
  }

  if (!row.refreshToken || !teamsProvider.refreshTokens) {
    return row.accessToken;
  }

  const refreshed = await teamsProvider.refreshTokens({
    accessToken: row.accessToken,
    refreshToken: row.refreshToken,
    tokenExpiresAt: expiresAt ?? null,
  });

  await db
    .update(churchIntegrations)
    .set({
      accessToken: refreshed.accessToken,
      refreshToken: refreshed.refreshToken ?? row.refreshToken,
      tokenExpiresAt: refreshed.tokenExpiresAt,
      updatedAt: new Date(),
    })
    .where(eq(churchIntegrations.id, row.id));

  return refreshed.accessToken;
}

/** Fetch user members of a Microsoft 365 group (id, displayName, mail). */
export async function getGroupMembers(
  accessToken: string,
  groupId: string
): Promise<GraphUser[]> {
  const out: GraphUser[] = [];
  let url: string | null = `${GRAPH_BASE}/groups/${encodeURIComponent(groupId)}/members/microsoft.graph.user?$select=id,displayName,mail&$top=999`;

  while (url) {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Graph API error: ${res.status} ${text}`);
    }
    const data = (await res.json()) as {
      value?: Array<{ id: string; displayName?: string | null; mail?: string | null }>;
      "@odata.nextLink"?: string;
    };
    const list = data.value ?? [];
    for (const u of list) {
      out.push({
        id: u.id,
        displayName: u.displayName ?? null,
        mail: u.mail ?? null,
      });
    }
    url = data["@odata.nextLink"] ?? null;
  }

  return out.filter((u) => u.mail?.trim());
}
