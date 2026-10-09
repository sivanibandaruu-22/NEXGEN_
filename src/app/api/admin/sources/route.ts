import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getSourceAdaptersStatus } from "@/lib/adapters";

export const runtime = "nodejs";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized. Admin role required." }, { status: 403 });
  }

  const sources = getSourceAdaptersStatus();
  return NextResponse.json({ sources });
}
