import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getActiveRepository } from "@/lib/repository";
import { getCurrentUser, logAudit } from "@/lib/auth";
import { normalizeSocialAsset } from "@/lib/detection/social";

export const runtime = "nodejs";

const AssetSchema = z.object({
  assetType: z.enum(["domain", "social", "app", "alias"]),
  platform: z.string().min(1, "Platform is required"),
  identifier: z.string().min(1, "Identifier is required"),
  url: z.string().url("Must be valid URL").optional().or(z.literal("")).nullable(),
});

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "owner" || !user.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = AssetSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || "Invalid asset payload" },
        { status: 400 }
      );
    }

    const { assetType, platform, identifier, url } = parsed.data;
    const repo = getActiveRepository();

    const profile = await repo.getBrandProfileByOrganizationId(user.organizationId);
    if (!profile) {
      return NextResponse.json({ error: "Brand profile not found" }, { status: 404 });
    }

    let finalPlatform = platform.toLowerCase();
    let finalIdentifier = identifier.trim();
    let finalUrl = url || null;

    if (assetType === "social") {
      const norm = normalizeSocialAsset(platform, identifier);
      if (norm) {
        finalPlatform = norm.platform;
        finalIdentifier = norm.identifier;
        finalUrl = url || norm.url;
      }
    }

    // Prevent duplicate asset with exact same identifier in this brand profile
    const existing = await repo.getAssetByBrandProfileAndIdentifier(
      profile.id,
      finalIdentifier,
      assetType
    );

    if (existing) {
      return NextResponse.json(
        { error: "This official asset has already been registered." },
        { status: 409 }
      );
    }

    const asset = await repo.createOfficialAsset({
      brandProfileId: profile.id,
      assetType,
      platform: finalPlatform,
      identifier: finalIdentifier,
      url: finalUrl,
      isVerified: 1,
    });

    await logAudit({
      actorId: user.userId,
      actorRole: user.role,
      action: "brand_asset.create",
      resourceType: "official_asset",
      resourceId: asset.id,
      metadata: { assetType, platform, identifier },
    });

    return NextResponse.json({
      success: true,
      asset,
    });
  } catch (error: any) {
    console.error("Failed to create official asset:", error);
    return NextResponse.json(
      { error: "Internal server error creating official asset" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "owner" || !user.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const assetId = searchParams.get("id");
    if (!assetId) {
      return NextResponse.json({ error: "Asset ID is required" }, { status: 400 });
    }

    const repo = getActiveRepository();
    const profile = await repo.getBrandProfileByOrganizationId(user.organizationId);
    if (!profile) {
      return NextResponse.json({ error: "Brand profile not found" }, { status: 404 });
    }

    // Ensure asset belongs to this brand profile (tenant isolation)
    const deleted = await repo.deleteOfficialAsset(assetId, profile.id);
    if (!deleted) {
      return NextResponse.json({ error: "Asset not found or access denied" }, { status: 404 });
    }

    await logAudit({
      actorId: user.userId,
      actorRole: user.role,
      action: "brand_asset.delete",
      resourceType: "official_asset",
      resourceId: assetId,
    });

    return NextResponse.json({ success: true, message: "Asset removed successfully" });
  } catch (error: any) {
    console.error("Failed to delete official asset:", error);
    return NextResponse.json(
      { error: "Internal server error deleting official asset" },
      { status: 500 }
    );
  }
}
