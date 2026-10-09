import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { OwnerNavbar } from "@/components/OwnerNavbar";

export const runtime = "nodejs";

export default async function OwnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "owner") {
    // If admin is browsing /owner, redirect to /admin
    redirect("/admin");
  }

  // Count unread notifications
  const db = getDb();
  let unreadCount = 0;
  if (user.organizationId) {
    const countRow = db.prepare(`
      SELECT COUNT(*) as count FROM notifications 
      WHERE organization_id = ? AND read_status = 0
    `).get(user.organizationId) as { count: number };
    unreadCount = countRow ? countRow.count : 0;
  }

  return (
    <div className="min-h-screen bg-surface-warm flex flex-col">
      <OwnerNavbar
        organizationName={user.organizationName || "Brand Portal"}
        verificationStatus={user.verificationStatus || "submitted"}
        unreadCount={unreadCount}
      />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
