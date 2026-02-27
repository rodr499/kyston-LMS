/**
 * Vercel API client for adding project domains (subdomains).
 * @see https://vercel.com/docs/rest-api
 */

const VERCEL_API_BASE = "https://api.vercel.com";

export type AddVercelDomainResult =
  | { ok: true }
  | { ok: false; error: string };

export async function addVercelDomain(params: {
  projectIdOrName: string;
  domain: string;
  teamId?: string;
}): Promise<AddVercelDomainResult> {
  const token = process.env.VERCEL_TOKEN;
  if (!token) {
    throw new Error("VERCEL_TOKEN must be set");
  }

  const url = new URL(`/v11/projects/${encodeURIComponent(params.projectIdOrName)}/domains`, VERCEL_API_BASE);
  if (params.teamId) url.searchParams.set("teamId", params.teamId);

  try {
    const res = await fetch(url.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name: params.domain }),
    });

    if (!res.ok) {
      const data = (await res.json()) as { error?: { message?: string } };
      const msg = data?.error?.message ?? (await res.text()).slice(0, 200);
      return { ok: false, error: `Vercel ${res.status}: ${msg}` };
    }

    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Vercel API error" };
  }
}

export type RemoveVercelDomainResult =
  | { ok: true }
  | { ok: false; error: string };

export async function removeVercelDomain(params: {
  projectIdOrName: string;
  domain: string;
  teamId?: string;
}): Promise<RemoveVercelDomainResult> {
  const token = process.env.VERCEL_TOKEN;
  if (!token) {
    throw new Error("VERCEL_TOKEN must be set");
  }

  const url = new URL(
    `/v9/projects/${encodeURIComponent(params.projectIdOrName)}/domains/${encodeURIComponent(params.domain)}`,
    VERCEL_API_BASE
  );
  if (params.teamId) url.searchParams.set("teamId", params.teamId);

  try {
    const res = await fetch(url.toString(), {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok && res.status !== 404) {
      const data = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
      const msg = data?.error?.message ?? (await res.text()).slice(0, 200);
      return { ok: false, error: `Vercel ${res.status}: ${msg}` };
    }

    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Vercel API error" };
  }
}
