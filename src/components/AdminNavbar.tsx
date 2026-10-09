"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ShieldAlert,
  Building,
  FolderGit2,
  AlertTriangle,
  FileCheck,
  Activity,
  Server,
  LogOut,
  LayoutDashboard,
} from "lucide-react";

export function AdminNavbar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch {
      router.push("/login");
    }
  };

  const navItems = [
    { label: "Admin Workspace", href: "/admin", icon: LayoutDashboard },
    { label: "Organizations & Verification", href: "/admin/organizations", icon: Building },
    { label: "Investigation Jobs", href: "/admin/investigations", icon: FolderGit2 },
    { label: "Findings & Triage", href: "/admin/findings", icon: AlertTriangle },
    { label: "Reports & Sharing", href: "/admin/reports", icon: FileCheck },
    { label: "Security & Audit", href: "/admin/security", icon: Activity },
    { label: "Data Sources", href: "/admin/sources", icon: Server },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-surface-border">
      {/* Top Admin Branding Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between border-b border-surface-border/60">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md bg-charcoal-900 border border-charcoal-800 flex items-center justify-center font-bold text-butter-400 shadow-sm">
              <ShieldAlert className="w-4 h-4 text-butter-400" />
            </div>
            <span className="font-bold text-base tracking-tight text-charcoal-900">
              KAMPUS<span className="text-butter-600">.VC</span>
            </span>
          </Link>
          <span className="text-charcoal-300">/</span>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-charcoal-800">Admin Control Plane</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-charcoal-900 text-butter-400 font-semibold">
              ROOT OPERATOR
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-charcoal-500 hidden sm:inline font-mono">
            admin@kampus.vc
          </span>
          <button
            onClick={handleLogout}
            type="button"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-charcoal-600 hover:text-rose-700 px-2.5 py-1.5 rounded-lg hover:bg-rose-50 transition-colors ml-2 cursor-pointer"
            title="Sign out"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>

      {/* Admin Nav Items Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="flex items-center gap-1 sm:gap-2 overflow-x-auto py-2 scrollbar-none text-xs font-medium">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md whitespace-nowrap transition-colors ${
                  isActive
                    ? "bg-charcoal-900 text-white font-semibold shadow-xs"
                    : "text-charcoal-600 hover:text-charcoal-900 hover:bg-surface-warm"
                }`}
              >
                {Icon && <Icon className={`w-3.5 h-3.5 ${isActive ? "text-butter-400" : "text-charcoal-500"}`} />}
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
