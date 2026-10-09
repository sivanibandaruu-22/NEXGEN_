"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import {
  Settings,
  ShieldCheck,
  User,
  Building2,
  Lock,
  Bell,
  CheckCircle2,
  Loader2,
} from "lucide-react";

export default function OwnerSettingsPage() {
  const [profile, setProfile] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/auth/me").then((r) => r.json()),
      fetch("/api/owner/brand-profile").then((r) => r.json()),
    ])
      .then(([userData, profileData]) => {
        setUser(userData?.user);
        setProfile(profileData);
      })
      .catch((err) => console.error("Error loading settings", err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="py-20 text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-charcoal-400 mb-3" />
        <p className="text-xs text-charcoal-500 font-mono">Loading Settings...</p>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Manage your account profile, organization parameters, notification preferences, and session controls."
        fallbackBackUrl="/owner"
        breadcrumbs={[{ label: "Overview", href: "/owner" }, { label: "Settings" }]}
      />

      <div className="max-w-4xl space-y-6">
        {/* User Account Profile */}
        <div className="bg-white rounded-xl border border-surface-border shadow-card p-6">
          <div className="flex items-center gap-2.5 pb-4 mb-4 border-b border-surface-border">
            <User className="w-5 h-5 text-charcoal-800" />
            <h3 className="text-sm font-bold text-charcoal-900">User Account Profile</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <span className="font-semibold text-charcoal-700 block mb-1">Full Name</span>
              <p className="text-charcoal-900 font-medium bg-surface-warm p-2.5 rounded-lg border border-surface-border">
                {user?.fullName || "N/A"}
              </p>
            </div>
            <div>
              <span className="font-semibold text-charcoal-700 block mb-1">Work Email Address</span>
              <p className="text-charcoal-900 font-mono bg-surface-warm p-2.5 rounded-lg border border-surface-border">
                {user?.email || "N/A"}
              </p>
            </div>
            <div>
              <span className="font-semibold text-charcoal-700 block mb-1">Assigned Application Role</span>
              <p className="text-charcoal-900 font-mono uppercase bg-surface-warm p-2.5 rounded-lg border border-surface-border font-bold">
                {user?.role || "owner"} (Tenant Owner)
              </p>
            </div>
            <div>
              <span className="font-semibold text-charcoal-700 block mb-1">Session Security</span>
              <p className="text-emerald-700 font-medium bg-surface-warm p-2.5 rounded-lg border border-surface-border flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> HttpOnly HMAC-SHA256 Token
              </p>
            </div>
          </div>
        </div>

        {/* Organization Information */}
        <div className="bg-white rounded-xl border border-surface-border shadow-card p-6">
          <div className="flex items-center gap-2.5 pb-4 mb-4 border-b border-surface-border">
            <Building2 className="w-5 h-5 text-charcoal-800" />
            <h3 className="text-sm font-bold text-charcoal-900">Organization Parameters</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <span className="font-semibold text-charcoal-700 block mb-1">Organization Legal Name</span>
              <p className="text-charcoal-900 font-medium bg-surface-warm p-2.5 rounded-lg border border-surface-border">
                {profile?.organization?.name}
              </p>
            </div>
            <div>
              <span className="font-semibold text-charcoal-700 block mb-1">Tenant Slug Identifier</span>
              <p className="text-charcoal-900 font-mono bg-surface-warm p-2.5 rounded-lg border border-surface-border">
                {profile?.organization?.slug}
              </p>
            </div>
            <div>
              <span className="font-semibold text-charcoal-700 block mb-1">Brand Name</span>
              <p className="text-charcoal-900 font-medium bg-surface-warm p-2.5 rounded-lg border border-surface-border">
                {profile?.brandProfile?.brand_name}
              </p>
            </div>
            <div>
              <span className="font-semibold text-charcoal-700 block mb-1">Primary Domain</span>
              <p className="text-charcoal-900 font-mono bg-surface-warm p-2.5 rounded-lg border border-surface-border">
                {profile?.brandProfile?.primary_domain}
              </p>
            </div>
          </div>
        </div>

        {/* Operational Security & Retention Policy */}
        <div className="bg-white rounded-xl border border-surface-border shadow-card p-6">
          <div className="flex items-center gap-2.5 pb-4 mb-4 border-b border-surface-border">
            <Lock className="w-5 h-5 text-charcoal-800" />
            <h3 className="text-sm font-bold text-charcoal-900">Security & Retention Policy</h3>
          </div>

          <div className="space-y-3 text-xs text-charcoal-600 leading-relaxed">
            <p>
              &bull; <strong>Tenant Isolation:</strong> Data records, detection telemetry, and report artifacts are strictly scoped to tenant ID <code>{profile?.organization?.id}</code>. Cross-organization access attempts are audited and rejected.
            </p>
            <p>
              &bull; <strong>Credential Storage:</strong> Passwords are cryptographically salted and hashed using scrypt (64-byte derived keys) with timing-safe comparison.
            </p>
            <p>
              &bull; <strong>SSRF Protection:</strong> All external asset lookups resolve IPs and reject loopback, link-local, and RFC1918 private subnets.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
