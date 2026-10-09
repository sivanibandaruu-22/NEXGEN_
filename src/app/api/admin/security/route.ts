import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized. Admin role required." }, { status: 403 });
  }

  const db = getDb();

  // Fetch security events
  const events = db.prepare(`
    SELECT id, event_type, email, ip_address, user_agent, severity, details_json, created_at
    FROM login_security_events
    ORDER BY created_at DESC
    LIMIT 50
  `).all() as any[];

  // Fetch audit logs
  const auditLogs = db.prepare(`
    SELECT id, actor_id, actor_role, action, resource_type, resource_id, metadata_json, created_at
    FROM audit_logs
    ORDER BY created_at DESC
    LIMIT 50
  `).all() as any[];

  const parsedEvents = events.map((e) => ({
    ...e,
    details: JSON.parse(e.details_json || "{}"),
  }));

  const parsedLogs = auditLogs.map((l) => ({
    ...l,
    metadata: JSON.parse(l.metadata_json || "{}"),
  }));

  return NextResponse.json({
    events: parsedEvents,
    auditLogs: parsedLogs,
  });
}
