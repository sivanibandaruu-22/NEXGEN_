"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ShieldCheck,
  Globe,
  Smartphone,
  Search,
  FileText,
  Bell,
  Settings,
  LogOut,
  FolderGit2,
} from "lucide-react";

interface OwnerNavbarProps {
  organizationName?: string;
  verificationStatus?: string;
  unreadCount?: number;
}

export function OwnerNavbar({
  organizationName = "Brand Portal",
  verificationStatus = "submitted",
  unreadCount = 0,
}: OwnerNavbarProps) {
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
    { label: "Overview", href: "/owner" },
    { label: "Brand Profile", href: "/owner/brand-profile", icon: ShieldCheck },
    { label: "Social Media Monitoring", href: "/owner/social-monitoring", icon: Globe },
    { label: "App Store Monitoring", href: "/owner/app-monitoring", icon: Smartphone },
    { label: "Look-alike Name Detection", href: "/owner/look-alike-detection", icon: Search },
    { label: "Investigations", href: "/owner/investigations", icon: FolderGit2 },
    { label: "Reports", href: "/owner/reports", icon: FileText },
  ];

  const getStatusBadge = () => {
    switch (verificationStatus) {
      case "verified":
        return <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold">VERIFIED</span>;
      case "pending_verification":
        return <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-semibold">PENDING REVIEW</span>;
      case "rejected":
        return <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-semibold">REJECTED</span>;
      default:
        return <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-stone-100 text-stone-700 font-semibold">SUBMITTED</span>;
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-surface-border">
      {/* Top Branding & Meta Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between border-b border-surface-border/60">
        <div className="flex items-center gap-3">
          <Link href="/owner" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md bg-butter-400 border border-butter-500/30 flex items-center justify-center font-bold text-charcoal-900 shadow-sm">
              <ShieldCheck className="w-4 h-4 text-charcoal-900" />
            </div>
            <span className="font-bold text-base tracking-tight text-charcoal-900">
              KAMPUS<span className="text-butter-600">.VC</span>
            </span>
          </Link>
          <span className="text-charcoal-300">/</span>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-charcoal-800">{organizationName}</span>
            {getStatusBadge()}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/owner/notifications"
            className="relative p-2 rounded-lg text-charcoal-600 hover:text-charcoal-900 hover:bg-surface-warm transition-colors"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-butter-500" />
            )}
          </Link>

          <Link
            href="/owner/settings"
            className="p-2 rounded-lg text-charcoal-600 hover:text-charcoal-900 hover:bg-surface-warm transition-colors"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </Link>

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

      {/* Primary Navigation Bar */}
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
                    ? "bg-butter-100 text-charcoal-900 font-semibold border border-butter-300/80 shadow-xs"
                    : "text-charcoal-600 hover:text-charcoal-900 hover:bg-surface-warm border border-transparent"
                }`}
              >
                {Icon && <Icon className={`w-3.5 h-3.5 ${isActive ? "text-charcoal-900" : "text-charcoal-500"}`} />}
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
