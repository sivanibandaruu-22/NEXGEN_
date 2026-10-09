import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "owner" || !user.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const notifications = db.prepare(`
    SELECT id, title, message, link, read_status, created_at
    FROM notifications
    WHERE organization_id = ?
    ORDER BY created_at DESC
  `).all(user.organizationId) as any[];

  return NextResponse.json({ notifications });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "owner" || !user.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { notificationId, markAll } = body;

  const db = getDb();

  if (markAll) {
    db.prepare(`UPDATE notifications SET read_status = 1 WHERE organization_id = ?`).run(user.organizationId);
  } else if (notificationId) {
    db.prepare(`UPDATE notifications SET read_status = 1 WHERE id = ? AND organization_id = ?`).run(
      notificationId,
      user.organizationId
    );
  }

  return NextResponse.json({ success: true });
}
