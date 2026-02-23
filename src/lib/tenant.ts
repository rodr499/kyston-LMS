import { headers } from "next/headers";

export interface Tenant {
  churchId: string;
  subdomain: string;
}

export async function getTenant(): Promise<Tenant | null> {
  const headersList = await headers();
  const churchId = headersList.get("x-church-id");
  const subdomain = headersList.get("x-church-subdomain");
  if (!churchId || !subdomain) return null;
  return { churchId, subdomain };
}

export function getTenantFromHeaders(headers: Headers): Tenant | null {
  const churchId = headers.get("x-church-id");
  const subdomain = headers.get("x-church-subdomain");
  if (!churchId || !subdomain) return null;
  return { churchId, subdomain };
}
