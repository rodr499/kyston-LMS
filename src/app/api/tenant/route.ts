import { headers } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  const h = await headers();
  const churchId = h.get("x-church-id");
  const subdomain = h.get("x-church-subdomain");
  if (!churchId || !subdomain) {
    return NextResponse.json({ tenant: null });
  }
  return NextResponse.json({
    tenant: { churchId, subdomain },
  });
}
