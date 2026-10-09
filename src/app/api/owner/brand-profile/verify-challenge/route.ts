import { NextResponse } from "next/server";
import { getActiveRepository } from "@/lib/repository";
import { getCurrentUser, logAudit } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST() {
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
    if (!profile) {
      return NextResponse.json({ error: "Brand profile not found" }, { status: 404 });
    }

    await repo.submitVerificationChallenge({
      organizationId: org.id,
      ownerUserId: user.userId,
      organizationName: org.name,
      primaryDomain: profile.primary_domain,
    });

    await logAudit({
      actorId: user.userId,
      actorRole: user.role,
      action: "verification.request_submitted",
      resourceType: "organization",
      resourceId: org.id,
      metadata: { domain: profile.primary_domain },
    });

    return NextResponse.json({
      success: true,
      verificationStatus: "pending_verification",
      message: "Verification challenge submitted. Awaiting administrative review.",
    });
  } catch (error: any) {
    console.error("Failed to submit verification challenge:", error);
    return NextResponse.json(
      { error: "Internal server error submitting verification challenge" },
      { status: 500 }
    );
  }
}
