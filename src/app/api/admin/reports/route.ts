import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import crypto from "node:crypto";
import { getDb } from "@/lib/db";
import { getCurrentUser, logAudit } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized. Admin role required." }, { status: 403 });
  }

  const db = getDb();
  const reports = db.prepare(`
    SELECT 
      r.id, r.job_id, r.organization_id, r.title, r.summary, r.status, r.findings_summary_json, r.shared_at, r.created_at,
      o.name as organization_name, o.slug as organization_slug,
      bp.brand_name
    FROM reports r
    JOIN organizations o ON r.organization_id = o.id
    LEFT JOIN brand_profiles bp ON o.id = bp.organization_id
    ORDER BY r.created_at DESC
  `).all() as any[];

  const parsedReports = reports.map((r) => ({
    ...r,
    findingsSummary: JSON.parse(r.findings_summary_json || "{}"),
  }));

  return NextResponse.json({ reports: parsedReports });
}

const ReportActionSchema = z.object({
  reportId: z.string().min(1, "Report ID is required"),
  action: z.enum(["approve", "share", "reject"]),
  reason: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized. Admin role required." }, { status: 403 });
  }

  const body = await req.json();
  const parsed = ReportActionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message || "Invalid input" }, { status: 400 });
  }

  const { reportId, action, reason } = parsed.data;
  const db = getDb();

  const report = db.prepare(`
    SELECT id, organization_id, title, status 
    FROM reports WHERE id = ?
  `).get(reportId) as any;

  if (!report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  const now = new Date().toISOString();

  db.exec("BEGIN TRANSACTION;");
  try {
    if (action === "approve") {
      db.prepare(`UPDATE reports SET status = 'approved' WHERE id = ?`).run(reportId);
    } else if (action === "share") {
      db.prepare(`UPDATE reports SET status = 'shared', shared_at = ? WHERE id = ?`).run(now, reportId);

      // Create persistent ReportShare record
      const shareToken = "shr_" + crypto.randomBytes(16).toString("hex");
      const shareId = "share_" + crypto.randomUUID().slice(0, 8);
      db.prepare(`
        INSERT INTO report_shares (id, report_id, shared_with_organization_id, shared_by_user_id, access_token, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(shareId, reportId, report.organization_id, user.userId, shareToken, now);

      // Notify Organization Owner
      const membership = db.prepare(`
        SELECT user_id FROM organization_memberships WHERE organization_id = ? LIMIT 1
      `).get(report.organization_id) as any;

      if (membership) {
        db.prepare(`
          INSERT INTO notifications (id, user_id, organization_id, title, message, link, read_status, created_at)
          VALUES (?, ?, ?, ?, ?, ?, 0, ?)
        `).run(
          "notif_" + crypto.randomUUID().slice(0, 8),
          membership.user_id,
          report.organization_id,
          "New Investigation Report Shared",
          `Admin has finalized and shared risk intelligence report: "${report.title}".`,
          `/owner/reports?id=${reportId}`,
          now
        );
      }
    }

    // Record Admin Review
    const reviewId = "rev_" + crypto.randomUUID().slice(0, 8);
    db.prepare(`
      INSERT INTO admin_reviews (id, target_id, target_type, decision, reason, reviewer_id, created_at)
      VALUES (?, ?, 'report', ?, ?, ?, ?)
    `).run(reviewId, reportId, action, reason || `Report ${action} by administrator.`, user.userId, now);

    db.exec("COMMIT;");
  } catch (err) {
    db.exec("ROLLBACK;");
    throw err;
  }

  logAudit({
    actorId: user.userId,
    actorRole: "admin",
    action: `report.${action}`,
    resourceType: "report",
    resourceId: reportId,
    metadata: { reason },
  });

  return NextResponse.json({
    success: true,
    message: `Report ${action === "share" ? "shared with organization owner" : "approved"} successfully.`,
  });
}
