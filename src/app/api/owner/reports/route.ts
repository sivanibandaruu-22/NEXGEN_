import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "owner" || !user.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const reportId = searchParams.get("id");

  const db = getDb();

  // If specific report requested
  if (reportId) {
    const report = db.prepare(`
      SELECT r.id, r.job_id, r.organization_id, r.title, r.summary, r.status, r.findings_summary_json, r.shared_at, r.created_at,
             o.name as organization_name, bp.brand_name, bp.primary_domain
      FROM reports r
      JOIN organizations o ON r.organization_id = o.id
      LEFT JOIN brand_profiles bp ON o.id = bp.organization_id
      WHERE r.id = ? AND r.organization_id = ? AND r.status = 'shared'
    `).get(reportId, user.organizationId) as any;

    if (!report) {
      return NextResponse.json({ error: "Report not found or not yet shared by administrator." }, { status: 404 });
    }

    // Fetch authorized findings for this report's job
    const findings = db.prepare(`
      SELECT id, category, platform, target_name, target_url, target_identifier,
             publisher_or_author, matched_brand, risk_score, confidence, match_types_json,
             evidence_json, status, created_at
      FROM detection_findings
      WHERE job_id = ? AND status != 'false_positive'
      ORDER BY risk_score DESC
    `).all(report.job_id) as any[];

    const parsedFindings = findings.map((f) => ({
      ...f,
      matchTypes: JSON.parse(f.match_types_json || "[]"),
      evidence: JSON.parse(f.evidence_json || "{}"),
    }));

    return NextResponse.json({
      report: {
        ...report,
        findingsSummary: JSON.parse(report.findings_summary_json || "{}"),
        findings: parsedFindings,
      },
    });
  }

  // List all shared reports for this organization
  const reports = db.prepare(`
    SELECT r.id, r.job_id, r.organization_id, r.title, r.summary, r.status, r.findings_summary_json, r.shared_at, r.created_at
    FROM reports r
    WHERE r.organization_id = ? AND r.status = 'shared'
    ORDER BY r.created_at DESC
  `).all(user.organizationId) as any[];

  const parsedReports = reports.map((r) => ({
    ...r,
    findingsSummary: JSON.parse(r.findings_summary_json || "{}"),
  }));

  return NextResponse.json({ reports: parsedReports });
}
