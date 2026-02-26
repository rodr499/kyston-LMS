import { NextResponse } from "next/server";
import { getRegistrationEnabled } from "@/lib/platform-settings";

export async function GET() {
  const registrationEnabled = await getRegistrationEnabled();
  return NextResponse.json({ registrationEnabled });
}
