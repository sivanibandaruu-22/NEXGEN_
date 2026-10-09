"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import {
  ShieldCheck,
  Globe,
  Smartphone,
  Search,
  FileText,
  AlertTriangle,
  FolderGit2,
  ArrowRight,
  Clock,
  CheckCircle2,
  ChevronRight,
  Loader2,
} from "lucide-react";

export default function OwnerOverviewPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/owner/brand-profile")
      .then((res) => res.json())
      .then((json) => setData(json))
      .catch((err) => console.error("Error loading overview", err))
      .finally(() => setLoading(false));
  }, []);

  const org = data?.organization;
  const bp = data?.brandProfile;
  const assets: any[] = data?.assets || [];

  return (
    <div className="w-full">
      <PageHeader
        title="Organization Risk Overview"
        description="Enterprise Digital Risk Protection Portal: Monitor, verify, and remediate digital impersonation threats across web, social media, and mobile app ecosystems."
        showBack={false}
      />

      {/* Verification State Banner */}
      {loading ? (
        <div className="mb-8 p-5 rounded-xl border border-surface-border bg-white shadow-card flex items-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-charcoal-400" />
          <span className="text-xs text-charcoal-500 font-mono">Loading organization verification status...</span>
        </div>
      ) : (
        <div className="mb-8 p-5 rounded-xl border border-surface-border bg-white shadow-card">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              {bp?.logo_url ? (
                <div className="w-12 h-12 rounded-lg bg-white border border-surface-border p-1 flex items-center justify-center flex-shrink-0 shadow-sm overflow-hidden">
                  <img
                    src={bp.logo_url}
                    alt={bp.brand_name || org?.name || "Brand logo"}
                    className="w-full h-full object-contain"
                  />
                </div>
              ) : org?.verification_status === "verified" ? (
                <div className="w-10 h-10 rounded-lg bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-800 flex-shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              ) : org?.verification_status === "pending_verification" ? (
                <div className="w-10 h-10 rounded-lg bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-800 flex-shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-lg bg-stone-100 border border-stone-300 flex items-center justify-center text-stone-800 flex-shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-charcoal-900">
                    Brand Verification Status:{" "}
                    <span className="font-mono text-xs uppercase text-charcoal-800">
                      {org?.verification_status?.replace("_", " ")}
                    </span>
                  </h3>
                </div>
                <p className="text-xs text-charcoal-600 mt-1 max-w-2xl leading-relaxed">
                  {org?.verification_status === "verified"
                    ? `Organization ${org?.name} is officially verified. Active official assets are protected against false-positive impersonation alerts.`
                    : org?.verification_status === "pending_verification"
                    ? `Verification request is currently being reviewed by Kampus.VC security lead.`
                    : `Please configure your DNS TXT record to verify root domain control and unlock priority monitoring.`}
                </p>
              </div>
            </div>

            <Link
              href="/owner/brand-profile"
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-butter-400 hover:bg-butter-500 text-charcoal-900 transition-colors shadow-sm flex-shrink-0"
            >
              Manage Brand Assets
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}

      {/* The Four Mandatory Feature Control Cards */}
      <div className="mb-10">
        <h2 className="text-xs font-mono font-bold uppercase text-charcoal-500 mb-4 tracking-wider">
          The Four Mandatory Defense Capabilities
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 1. Brand Profile */}
          <Link
            href="/owner/brand-profile"
            className="group relative p-6 rounded-xl bg-white border border-surface-border hover:border-butter-400 shadow-card hover:shadow-elevation transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-lg bg-surface-warm group-hover:bg-butter-100 border border-surface-border flex items-center justify-center text-charcoal-900 transition-colors overflow-hidden">
                  {bp?.logo_url ? (
                    <img
                      src={bp.logo_url}
                      alt={bp.brand_name || "Logo"}
                      className="w-full h-full object-contain p-1"
                    />
                  ) : (
                    <ShieldCheck className="w-5 h-5 text-charcoal-900" />
                  )}
                </div>
                <span className="text-[10px] font-mono font-semibold uppercase px-2 py-0.5 rounded bg-surface-warm text-charcoal-600">
                  {loading ? "..." : `${assets.length} ASSETS`}
                </span>
              </div>
              <h3 className="text-base font-bold text-charcoal-900 group-hover:text-butter-700 transition-colors">
                Brand Profile
              </h3>
              <p className="text-xs text-charcoal-600 mt-1.5 leading-relaxed">
                Register official domains, verified social accounts, store packages, and DNS challenge tokens for official asset exclusion.
              </p>
            </div>
            <div className="mt-5 pt-3 border-t border-surface-border/60 flex items-center justify-between text-xs font-semibold text-charcoal-700 group-hover:text-charcoal-900">
              <span>View Profile & Assets</span>
              <ChevronRight className="w-4 h-4 text-charcoal-400 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </Link>

          {/* 2. Social Media Monitoring */}
          <Link
            href="/owner/social-monitoring"
            className="group relative p-6 rounded-xl bg-white border border-surface-border hover:border-butter-400 shadow-card hover:shadow-elevation transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-lg bg-surface-warm group-hover:bg-butter-100 border border-surface-border flex items-center justify-center text-charcoal-900 transition-colors">
                  <Globe className="w-5 h-5 text-charcoal-900" />
                </div>
                <span className="text-[10px] font-mono font-semibold uppercase px-2 py-0.5 rounded bg-surface-warm text-charcoal-600">
                  MULTI-NETWORK
                </span>
              </div>
              <h3 className="text-base font-bold text-charcoal-900 group-hover:text-butter-700 transition-colors">
                Social Media Monitoring
              </h3>
              <p className="text-xs text-charcoal-600 mt-1.5 leading-relaxed">
                Inspect detected impersonators across X, Instagram, Facebook, and Telegram with explainable evidence signals.
              </p>
            </div>
            <div className="mt-5 pt-3 border-t border-surface-border/60 flex items-center justify-between text-xs font-semibold text-charcoal-700 group-hover:text-charcoal-900">
              <span>Inspect Social Threats</span>
              <ChevronRight className="w-4 h-4 text-charcoal-400 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </Link>

          {/* 3. App Store Monitoring */}
          <Link
            href="/owner/app-monitoring"
            className="group relative p-6 rounded-xl bg-white border border-surface-border hover:border-butter-400 shadow-card hover:shadow-elevation transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-lg bg-surface-warm group-hover:bg-butter-100 border border-surface-border flex items-center justify-center text-charcoal-900 transition-colors">
                  <Smartphone className="w-5 h-5 text-charcoal-900" />
                </div>
                <span className="text-[10px] font-mono font-semibold uppercase px-2 py-0.5 rounded bg-surface-warm text-charcoal-600">
                  PLAY & APP STORE
                </span>
              </div>
              <h3 className="text-base font-bold text-charcoal-900 group-hover:text-butter-700 transition-colors">
                App Store Monitoring
              </h3>
              <p className="text-xs text-charcoal-600 mt-1.5 leading-relaxed">
                Monitor rogue APKs, developer entity mismatches, and package identifier clones across mobile application markets.
              </p>
            </div>
            <div className="mt-5 pt-3 border-t border-surface-border/60 flex items-center justify-between text-xs font-semibold text-charcoal-700 group-hover:text-charcoal-900">
              <span>Inspect App Store Threats</span>
              <ChevronRight className="w-4 h-4 text-charcoal-400 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </Link>

          {/* 4. Look-alike Name Detection */}
          <Link
            href="/owner/look-alike-detection"
            className="group relative p-6 rounded-xl bg-white border border-surface-border hover:border-butter-400 shadow-card hover:shadow-elevation transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-lg bg-surface-warm group-hover:bg-butter-100 border border-surface-border flex items-center justify-center text-charcoal-900 transition-colors">
                  <Search className="w-5 h-5 text-charcoal-900" />
                </div>
                <span className="text-[10px] font-mono font-semibold uppercase px-2 py-0.5 rounded bg-surface-warm text-charcoal-600">
                  INTERACTIVE ENGINE
                </span>
              </div>
              <h3 className="text-base font-bold text-charcoal-900 group-hover:text-butter-700 transition-colors">
                Look-alike Name Detection
              </h3>
              <p className="text-xs text-charcoal-600 mt-1.5 leading-relaxed">
                Test candidates against homoglyphs, character transpositions, leetspeak substitutions, and view the empirical benchmark.
              </p>
            </div>
            <div className="mt-5 pt-3 border-t border-surface-border/60 flex items-center justify-between text-xs font-semibold text-charcoal-700 group-hover:text-charcoal-900">
              <span>Launch Test Workbench</span>
              <ChevronRight className="w-4 h-4 text-charcoal-400 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </Link>
        </div>
      </div>

      {/* Quick Actions & Navigation Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          href="/owner/investigations"
          className="p-4 rounded-xl bg-white border border-surface-border shadow-card flex items-center justify-between hover:border-butter-400 transition-all"
        >
          <div className="flex items-center gap-3">
            <FolderGit2 className="w-5 h-5 text-charcoal-700" />
            <div>
              <h4 className="text-xs font-bold text-charcoal-900">Investigation Pipeline</h4>
              <p className="text-[11px] text-charcoal-500">Track and request real data adapter scans</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-charcoal-400" />
        </Link>

        <Link
          href="/owner/reports"
          className="p-4 rounded-xl bg-white border border-surface-border shadow-card flex items-center justify-between hover:border-butter-400 transition-all"
        >
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-charcoal-700" />
            <div>
              <h4 className="text-xs font-bold text-charcoal-900">Shared Intelligence Reports</h4>
              <p className="text-[11px] text-charcoal-500">Download finalized PDF and CSV audits</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-charcoal-400" />
        </Link>
      </div>
    </div>
  );
}
