import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getActiveRepository } from "@/lib/repository";
import { getCurrentUser, logAudit } from "@/lib/auth";

export const runtime = "nodejs";

const DecisionSchema = z.object({
  organizationId: z.string().min(1, "Organization ID is required"),
  decision: z.enum(["approve", "reject", "needs_info"]),
  reason: z.string().min(5, "A recorded reason (min 5 characters) is mandatory"),
});

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized. Admin role required." }, { status: 403 });
    }

    const body = await req.json();
    const parsed = DecisionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || "Invalid decision payload" },
        { status: 400 }
      );
    }

    const { organizationId, decision, reason } = parsed.data;
    const repo = getActiveRepository();

    const org = await repo.getOrganizationById(organizationId);
    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    // Prevent duplicate and conflicting decisions
    if (decision === "approve" && org.verification_status === "verified") {
      return NextResponse.json(
        { error: `Organization "${org.name}" is already verified. Duplicate approval prevented.` },
        { status: 400 }
      );
    }

    if (decision === "reject" && org.verification_status === "rejected") {
      return NextResponse.json(
        { error: `Organization "${org.name}" is already rejected. Conflicting decision prevented.` },
        { status: 400 }
      );
    }

    const result = await repo.recordAdminOrganizationDecision({
      organizationId,
      decision,
      reason,
      reviewerId: user.userId,
    });

    await logAudit({
      actorId: user.userId,
      actorRole: "admin",
      action: `organization.verification_${decision}`,
      resourceType: "organization",
      resourceId: organizationId,
      metadata: { decision, reason },
    });

    return NextResponse.json({
      success: true,
      newStatus: result.newStatus,
      message: `Organization ${org.name} verification status updated to ${result.newStatus}.`,
    });
  } catch (error: any) {
    console.error("Admin decision error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process organization decision" },
      { status: 500 }
    );
  }
}
