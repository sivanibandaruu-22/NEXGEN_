import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { analyzeLookalikeName } from "@/lib/detection/lookalike";

export const runtime = "nodejs";

const LookalikeTestSchema = z.object({
  candidate: z.string().min(1, "Candidate name is required"),
  brandName: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "owner" || !user.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = LookalikeTestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message || "Invalid input" },
      { status: 400 }
    );
  }

  const db = getDb();
  const profile = db.prepare(`
    SELECT id, brand_name FROM brand_profiles 
    WHERE organization_id = ?
  `).get(user.organizationId) as any;

  const targetBrand = parsed.data.brandName || profile?.brand_name || "Brand";

  let aliases: string[] = [];
  if (profile) {
    const assetRows = db.prepare(`
      SELECT identifier FROM official_assets 
      WHERE brand_profile_id = ? AND asset_type = 'alias'
    `).all(profile.id) as any[];
    aliases = assetRows.map((r) => r.identifier);
  }

  const analysis = analyzeLookalikeName(parsed.data.candidate, targetBrand, aliases);

  return NextResponse.json({
    targetBrand,
    candidate: parsed.data.candidate,
    analysis,
    knownAliases: aliases,
  });
}
