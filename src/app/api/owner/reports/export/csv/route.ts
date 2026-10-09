import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCurrentUser, logAudit } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const reportId = searchParams.get("reportId");
  if (!reportId) {
    return NextResponse.json({ error: "Report ID required" }, { status: 400 });
  }

  const db = getDb();

  let reportQuery = `
    SELECT id, job_id, title 
    FROM reports 
    WHERE id = ?
  `;
  const reportParams = [reportId];

  // If user is owner, enforce tenant isolation and shared status
  if (user.role === "owner") {
    if (!user.organizationId) {
      return NextResponse.json({ error: "Organization context required" }, { status: 401 });
    }
    reportQuery += " AND organization_id = ? AND status = 'shared'";
    reportParams.push(user.organizationId);
  }

  const report = db.prepare(reportQuery).get(...reportParams) as any;

  if (!report) {
    return NextResponse.json({ error: "Report not found or access denied" }, { status: 404 });
  }

  const findings = db.prepare(`
    SELECT category, platform, target_name, target_url, target_identifier,
           publisher_or_author, risk_score, confidence, match_types_json, created_at
    FROM detection_findings
    WHERE job_id = ? AND status != 'false_positive'
    ORDER BY risk_score DESC
  `).all(report.job_id) as any[];

  // Build CSV
  const headers = [
    "Category",
    "Platform",
    "Target Name",
    "Identifier",
    "URL",
    "Publisher/Developer",
    "Risk Score",
    "Confidence",
    "Match Types",
    "Detected At",
  ];

  const escapeCsv = (str: string | null | undefined) => {
    if (!str) return '""';
    const s = String(str).replace(/"/g, '""');
    return `"${s}"`;
  };

  const rows = findings.map((f) => {
    const matchTypes = JSON.parse(f.match_types_json || "[]").join("; ");
    return [
      escapeCsv(f.category),
      escapeCsv(f.platform),
      escapeCsv(f.target_name),
      escapeCsv(f.target_identifier),
      escapeCsv(f.target_url),
      escapeCsv(f.publisher_or_author),
      f.risk_score,
      escapeCsv(f.confidence),
      escapeCsv(matchTypes),
      escapeCsv(f.created_at),
    ].join(",");
  });

  const csvContent = [headers.join(","), ...rows].join("\n");

  logAudit({
    actorId: user.userId,
    actorRole: "owner",
    action: "report.export_csv",
    resourceType: "report",
    resourceId: reportId,
    metadata: { rowCount: findings.length },
  });

  const filename = `kampus_findings_${report.title.toLowerCase().replace(/[^a-z0-9]+/g, "_")}.csv`;

  return new NextResponse(csvContent, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
