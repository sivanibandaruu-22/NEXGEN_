import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getActiveRepository } from "@/lib/repository";
import { getCurrentUser, logAudit } from "@/lib/auth";

export const runtime = "nodejs";

const UpdateProfileSchema = z.object({
  brandName: z.string().min(2, "Brand name must be at least 2 characters"),
  industry: z.string().min(2, "Industry is required"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  logoUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  primaryDomain: z.string().regex(/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, "Must be a valid domain"),
});

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "owner" || !user.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const repo = getActiveRepository();
    const org = await repo.getOrganizationById(user.organizationId);

    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    const profile = await repo.getBrandProfileByOrganizationId(user.organizationId);
    const assets = profile ? await repo.getAssetsByBrandProfileId(profile.id) : [];

    return NextResponse.json({
      organization: org,
      brandProfile: profile,
      assets,
    });
  } catch (error: any) {
    console.error("Failed to fetch brand profile:", error);
    return NextResponse.json(
      { error: "Internal server error fetching brand profile" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "owner" || !user.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = UpdateProfileSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const repo = getActiveRepository();
    const updated = await repo.updateBrandProfile(user.organizationId, parsed.data);

    if (!updated) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    await logAudit({
      actorId: user.userId,
      actorRole: user.role,
      action: "brand_profile.update",
      resourceType: "brand_profile",
      resourceId: updated.id,
      metadata: { brandName: parsed.data.brandName, primaryDomain: parsed.data.primaryDomain },
    });

    return NextResponse.json({ success: true, message: "Brand Profile updated successfully" });
  } catch (error: any) {
    console.error("Failed to update brand profile:", error);
    return NextResponse.json(
      { error: "Internal server error updating brand profile" },
      { status: 500 }
    );
  }
}
