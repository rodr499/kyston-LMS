/**
 * Subdomain provisioning: Vercel only.
 * Dynu uses wildcard subdomain, so we only add/remove domains in Vercel.
 */

import { addVercelDomain, removeVercelDomain } from "./vercel";

export type ProvisionSubdomainResult =
  | { ok: true }
  | { ok: false; error: string };

export type DeprovisionSubdomainResult =
  | { ok: true }
  | { ok: false; error: string };

function isConfigured(): boolean {
  return !!(
    process.env.VERCEL_TOKEN &&
    (process.env.VERCEL_PROJECT_ID || process.env.VERCEL_PROJECT_NAME)
  );
}

export async function provisionSubdomain(subdomain: string): Promise<ProvisionSubdomainResult> {
  if (!isConfigured()) {
    return {
      ok: false,
      error: "Subdomain automation not configured (VERCEL_* env vars)",
    };
  }

  const apexDomain = process.env.NEXT_PUBLIC_APP_DOMAIN ?? "kyston.org";
  const fullDomain = `${subdomain}.${apexDomain}`;
  const projectId = process.env.VERCEL_PROJECT_ID ?? process.env.VERCEL_PROJECT_NAME ?? "";
  const teamId = process.env.VERCEL_TEAM_ID ?? undefined;

  if (!projectId) {
    return { ok: false, error: "VERCEL_PROJECT_ID or VERCEL_PROJECT_NAME required" };
  }

  const result = await addVercelDomain({
    projectIdOrName: projectId,
    domain: fullDomain,
    teamId,
  });

  return result.ok ? { ok: true } : { ok: false, error: result.error };
}

export async function deprovisionSubdomain(subdomain: string): Promise<DeprovisionSubdomainResult> {
  if (!isConfigured()) {
    return { ok: false, error: "Subdomain automation not configured (VERCEL_* env vars)" };
  }

  const apexDomain = process.env.NEXT_PUBLIC_APP_DOMAIN ?? "kyston.org";
  const fullDomain = `${subdomain}.${apexDomain}`;
  const projectId = process.env.VERCEL_PROJECT_ID ?? process.env.VERCEL_PROJECT_NAME ?? "";
  const teamId = process.env.VERCEL_TEAM_ID ?? undefined;

  if (!projectId) {
    return { ok: false, error: "VERCEL_PROJECT_ID or VERCEL_PROJECT_NAME required" };
  }

  const result = await removeVercelDomain({
    projectIdOrName: projectId,
    domain: fullDomain,
    teamId,
  });

  return result.ok ? { ok: true } : { ok: false, error: result.error };
}
