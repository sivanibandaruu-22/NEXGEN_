import { NextResponse } from "next/server";
import { getActiveRepository } from "@/lib/repository";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized. Admin role required." }, { status: 403 });
    }

    const repo = getActiveRepository();
    const organizations = await repo.getAllOrganizationsWithDetails();

    return NextResponse.json({ organizations });
  } catch (error: any) {
    console.error("Failed to fetch organizations:", error);
    return NextResponse.json(
      { error: "Internal server error fetching organizations." },
      { status: 500 }
    );
  }
}
