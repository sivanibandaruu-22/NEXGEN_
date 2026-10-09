import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import crypto from "node:crypto";
import { getDb } from "@/lib/db";
import { getCurrentUser, logAudit } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized. Admin role required." }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const jobId = searchParams.get("jobId");
  const status = searchParams.get("status") || "all";

  const db = getDb();
  let query = `
    SELECT 
      f.id, f.job_id, f.category, f.platform, f.target_name, f.target_url, f.target_identifier,
      f.publisher_or_author, f.matched_brand, f.risk_score, f.confidence, f.match_types_json,
      f.evidence_json, f.status, f.dismissed_reason, f.dismissed_by, f.created_at,
      j.organization_id, o.name as organization_name
    FROM detection_findings f
    JOIN investigation_jobs j ON f.job_id = j.id
    JOIN organizations o ON j.organization_id = o.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (jobId) {
    query += " AND f.job_id = ?";
    params.push(jobId);
  }

  if (status !== "all") {
    query += " AND f.status = ?";
    params.push(status);
  }

  query += " ORDER BY f.risk_score DESC, f.created_at DESC";

  const findings = db.prepare(query).all(...params) as any[];

  const parsedFindings = findings.map((f) => ({
    ...f,
    matchTypes: JSON.parse(f.match_types_json || "[]"),
    evidence: JSON.parse(f.evidence_json || "{}"),
  }));

  return NextResponse.json({ findings: parsedFindings });
}

const TriageSchema = z.object({
  findingId: z.string().min(1, "Finding ID is required"),
  status: z.enum(["active", "dismissed", "false_positive"]),
  reason: z.string().min(3, "A justification reason is required"),
});

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized. Admin role required." }, { status: 403 });
  }

  const body = await req.json();
  const parsed = TriageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message || "Invalid input" }, { status: 400 });
  }

  const { findingId, status, reason } = parsed.data;
  const db = getDb();

  const finding = db.prepare("SELECT id, job_id, target_name, risk_score FROM detection_findings WHERE id = ?").get(findingId) as any;
  if (!finding) {
    return NextResponse.json({ error: "Finding not found" }, { status: 404 });
  }

  const now = new Date().toISOString();

  db.exec("BEGIN TRANSACTION;");
  try {
    // 1. Update Finding status
    db.prepare(`
      UPDATE detection_findings 
      SET status = ?, dismissed_reason = ?, dismissed_by = ? 
      WHERE id = ?
    `).run(status, reason, user.userId, findingId);

    // 2. Insert Admin Review Record
    const reviewId = "rev_" + crypto.randomUUID().slice(0, 8);
    db.prepare(`
      INSERT INTO admin_reviews (id, target_id, target_type, decision, reason, reviewer_id, created_at)
      VALUES (?, ?, 'finding', ?, ?, ?, ?)
    `).run(reviewId, findingId, status, reason, user.userId, now);

    db.exec("COMMIT;");
  } catch (err) {
    db.exec("ROLLBACK;");
    throw err;
  }

  logAudit({
    actorId: user.userId,
    actorRole: "admin",
    action: `finding.triage_${status}`,
    resourceType: "detection_finding",
    resourceId: findingId,
    metadata: { reason, previousStatus: finding.status },
  });

  return NextResponse.json({
    success: true,
    message: `Finding marked as ${status.replace("_", " ")}.`,
  });
}
