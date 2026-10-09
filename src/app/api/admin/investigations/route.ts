import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import crypto from "node:crypto";
import { getDb } from "@/lib/db";
import { getCurrentUser, logAudit } from "@/lib/auth";
import { runInvestigationPipeline } from "@/lib/investigation/pipeline";

export const runtime = "nodejs";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized. Admin role required." }, { status: 403 });
  }

  const db = getDb();
  const jobs = db.prepare(`
    SELECT 
      j.id, j.organization_id, j.status, j.scope, j.requested_by, j.records_analyzed, 
      j.sources_run_json, j.stages_json, j.error_log, j.started_at, j.completed_at, j.created_at,
      o.name as organization_name, o.slug as organization_slug, o.verification_status,
      bp.brand_name
    FROM investigation_jobs j
    JOIN organizations o ON j.organization_id = o.id
    LEFT JOIN brand_profiles bp ON o.id = bp.organization_id
    ORDER BY j.created_at DESC
  `).all() as any[];

  return NextResponse.json({ jobs });
}

const ExecuteJobSchema = z.object({
  jobId: z.string().optional(),
  organizationId: z.string().optional(),
  scope: z.enum(["full", "social_only", "app_only"]).optional().default("full"),
  stream: z.boolean().optional().default(false),
});

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized. Admin role required." }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = ExecuteJobSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
  }

  const { jobId, organizationId, scope, stream } = parsed.data;
  const db = getDb();

  let targetJobId = jobId;

  if (!targetJobId) {
    if (!organizationId) {
      return NextResponse.json({ error: "Either jobId or organizationId must be provided" }, { status: 400 });
    }

    // Check if there is an existing pending job for this organization
    const existing = db.prepare(`
      SELECT id FROM investigation_jobs 
      WHERE organization_id = ? AND status IN ('pending_approval', 'running')
      ORDER BY created_at DESC LIMIT 1
    `).get(organizationId) as any;

    if (existing) {
      targetJobId = existing.id;
    } else {
      // Create a new investigation job for this organization
      targetJobId = "job_" + crypto.randomUUID().slice(0, 8);
      const now = new Date().toISOString();
      db.prepare(`
        INSERT INTO investigation_jobs (id, organization_id, status, scope, requested_by, records_analyzed, sources_run_json, stages_json, created_at)
        VALUES (?, ?, 'pending_approval', ?, ?, 0, '[]', '[]', ?)
      `).run(targetJobId, organizationId, scope, user.fullName || "Admin", now);

      logAudit({
        actorId: user.userId,
        actorRole: "admin",
        action: "investigation.created",
        resourceType: "investigation_job",
        resourceId: targetJobId,
        metadata: { organizationId, scope },
      });
    }
  }

  if (stream) {
    const encoder = new TextEncoder();
    const customStream = new ReadableStream({
      async start(controller) {
        try {
          const onStageUpdate = (stage: any) => {
            try {
              controller.enqueue(encoder.encode(JSON.stringify({ type: "stage", stage }) + "\n"));
            } catch {
              // client closed connection
            }
          };

          const result = await runInvestigationPipeline(targetJobId!, user.userId, onStageUpdate);
          controller.enqueue(encoder.encode(JSON.stringify({ type: "done", result }) + "\n"));
          controller.close();
        } catch (err: any) {
          try {
            controller.enqueue(encoder.encode(JSON.stringify({ type: "error", error: err.message }) + "\n"));
            controller.close();
          } catch {
            // client closed connection
          }
        }
      },
    });

    return new Response(customStream, {
      headers: {
        "Content-Type": "application/x-ndjson",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
      },
    });
  }

  try {
    const result = await runInvestigationPipeline(targetJobId!, user.userId);
    return NextResponse.json({
      success: true,
      message: "Investigation pipeline executed successfully across all 12 stages.",
      result,
    });
  } catch (err: any) {
    console.error("Pipeline execution failed:", err);
    return NextResponse.json(
      { error: err.message || "Pipeline execution failed" },
      { status: 500 }
    );
  }
}
