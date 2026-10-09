import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AdminNavbar } from "@/components/AdminNavbar";

export const runtime = "nodejs";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "admin") {
    // If not admin, redirect to owner portal
    redirect("/owner");
  }

  return (
    <div className="min-h-screen bg-surface-warm flex flex-col">
      <AdminNavbar />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
