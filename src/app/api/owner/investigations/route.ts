import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import crypto from "node:crypto";
import { getDb } from "@/lib/db";
import { getCurrentUser, logAudit } from "@/lib/auth";

export const runtime = "nodejs";

const RequestInvestigationSchema = z.object({
  scope: z.enum(["full", "social_only", "app_only"]).default("full"),
});

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "owner" || !user.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const jobs = db.prepare(`
    SELECT id, status, scope, requested_by, records_analyzed, sources_run_json, started_at, completed_at, created_at
    FROM investigation_jobs
    WHERE organization_id = ?
    ORDER BY created_at DESC
  `).all(user.organizationId) as any[];

  return NextResponse.json({ jobs });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "owner" || !user.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = RequestInvestigationSchema.safeParse(body);
  const scope = parsed.success ? parsed.data.scope : "full";

  const db = getDb();
  const org = db.prepare("SELECT id, name, verification_status FROM organizations WHERE id = ?").get(user.organizationId) as any;
  if (!org) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  const jobId = "job_" + crypto.randomUUID().slice(0, 8);
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO investigation_jobs (id, organization_id, status, scope, requested_by, records_analyzed, sources_run_json, created_at)
    VALUES (?, ?, 'pending_approval', ?, ?, 0, '[]', ?)
  `).run(jobId, user.organizationId, scope, user.fullName, now);

  // Notify Admin
  const admin = db.prepare("SELECT id FROM users WHERE role = 'admin' LIMIT 1").get() as any;
  if (admin) {
    db.prepare(`
      INSERT INTO notifications (id, user_id, organization_id, title, message, link, read_status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 0, ?)
    `).run(
      "notif_" + crypto.randomUUID().slice(0, 8),
      admin.id,
      user.organizationId,
      `New Investigation Request: ${org.name}`,
      `Scope: ${scope.toUpperCase()}. Awaiting administrative approval to run data adapters.`,
      "/admin/investigations",
      now
    );
  }

  logAudit({
    actorId: user.userId,
    actorRole: "owner",
    action: "investigation.request_created",
    resourceType: "investigation_job",
    resourceId: jobId,
    metadata: { scope },
  });

  return NextResponse.json({
    success: true,
    jobId,
    message: "Investigation request submitted. Queued for admin approval.",
  });
}
