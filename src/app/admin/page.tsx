"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import {
  ShieldAlert,
  Building,
  FolderGit2,
  AlertTriangle,
  FileCheck,
  Activity,
  Server,
  ArrowRight,
  Clock,
  CheckCircle2,
  ChevronRight,
  Loader2,
  Users,
} from "lucide-react";

export default function AdminWorkspacePage() {
  const [stats, setStats] = useState({
    orgCount: 0,
    pendingOrgs: 0,
    jobsCount: 0,
    findingsCount: 0,
    securityEventsCount: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/organizations").then((r) => r.json()),
      fetch("/api/admin/investigations").then((r) => r.json()),
      fetch("/api/admin/findings").then((r) => r.json()),
      fetch("/api/admin/security").then((r) => r.json()),
    ])
      .then(([orgsData, jobsData, findingsData, secData]) => {
        const orgs = orgsData.organizations || [];
        const pending = orgs.filter((o: any) => o.verificationStatus === "pending_verification").length;
        setStats({
          orgCount: orgs.length,
          pendingOrgs: pending,
          jobsCount: (jobsData.jobs || []).length,
          findingsCount: (findingsData.findings || []).length,
          securityEventsCount: (secData.events || []).length,
        });
      })
      .catch((err) => console.error("Error loading admin stats", err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <PageHeader
        title="Admin Control Plane"
        description="Platform operations workspace: Organization verification determination, investigation job dispatching, threat evidence triage, and report sharing."
        fallbackBackUrl="/"
      />

      {/* KPI Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <Link
          href="/admin/organizations"
          className="p-4 rounded-xl bg-white border border-surface-border hover:border-butter-400 shadow-card transition-all"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono font-bold uppercase text-charcoal-500">Organizations</span>
            <Building className="w-4 h-4 text-charcoal-400" />
          </div>
          <div className="text-2xl font-bold text-charcoal-900">{stats.orgCount}</div>
          <span className="text-xs text-amber-700 font-semibold mt-1 block">
            {stats.pendingOrgs} pending review
          </span>
        </Link>

        <Link
          href="/admin/investigations"
          className="p-4 rounded-xl bg-white border border-surface-border hover:border-butter-400 shadow-card transition-all"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono font-bold uppercase text-charcoal-500">Investigations</span>
            <FolderGit2 className="w-4 h-4 text-charcoal-400" />
          </div>
          <div className="text-2xl font-bold text-charcoal-900">{stats.jobsCount}</div>
          <span className="text-xs text-charcoal-500 mt-1 block">Data adapter jobs</span>
        </Link>

        <Link
          href="/admin/findings"
          className="p-4 rounded-xl bg-white border border-surface-border hover:border-butter-400 shadow-card transition-all"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono font-bold uppercase text-charcoal-500">Active Findings</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-bold text-rose-600">{stats.findingsCount}</div>
          <span className="text-xs text-charcoal-500 mt-1 block">Triage queue</span>
        </Link>

        <Link
          href="/admin/security"
          className="p-4 rounded-xl bg-white border border-surface-border hover:border-butter-400 shadow-card transition-all"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono font-bold uppercase text-charcoal-500">Login Threats</span>
            <Activity className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-charcoal-900">{stats.securityEventsCount}</div>
          <span className="text-xs text-charcoal-500 mt-1 block">Auth security alerts</span>
        </Link>
      </div>

      {/* Control Plane Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Link
          href="/admin/organizations"
          className="p-6 rounded-xl bg-white border border-surface-border hover:border-butter-400 shadow-card transition-all flex flex-col justify-between"
        >
          <div>
            <div className="w-10 h-10 rounded-lg bg-surface-warm border border-surface-border flex items-center justify-center mb-4">
              <Building className="w-5 h-5 text-charcoal-800" />
            </div>
            <h3 className="text-base font-bold text-charcoal-900">Organizations & Verification</h3>
            <p className="text-xs text-charcoal-600 mt-1 leading-relaxed">
              Inspect submitted brand identities, review cryptographic DNS TXT tokens, and record approval or rejection determinations.
            </p>
          </div>
          <div className="mt-5 pt-3 border-t border-surface-border flex items-center justify-between text-xs font-semibold text-charcoal-800">
            <span>Review Organizations</span>
            <ChevronRight className="w-4 h-4 text-charcoal-400" />
          </div>
        </Link>

        <Link
          href="/admin/investigations"
          className="p-6 rounded-xl bg-white border border-surface-border hover:border-butter-400 shadow-card transition-all flex flex-col justify-between"
        >
          <div>
            <div className="w-10 h-10 rounded-lg bg-surface-warm border border-surface-border flex items-center justify-center mb-4">
              <FolderGit2 className="w-5 h-5 text-charcoal-800" />
            </div>
            <h3 className="text-base font-bold text-charcoal-900">Investigation Pipeline</h3>
            <p className="text-xs text-charcoal-600 mt-1 leading-relaxed">
              Validate requested scope, trigger live data adapters, execute Look-alike and Store detection, and generate reports.
            </p>
          </div>
          <div className="mt-5 pt-3 border-t border-surface-border flex items-center justify-between text-xs font-semibold text-charcoal-800">
            <span>Manage Jobs</span>
            <ChevronRight className="w-4 h-4 text-charcoal-400" />
          </div>
        </Link>

        <Link
          href="/admin/findings"
          className="p-6 rounded-xl bg-white border border-surface-border hover:border-butter-400 shadow-card transition-all flex flex-col justify-between"
        >
          <div>
            <div className="w-10 h-10 rounded-lg bg-surface-warm border border-surface-border flex items-center justify-center mb-4">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
            </div>
            <h3 className="text-base font-bold text-charcoal-900">Findings & Evidence Triage</h3>
            <p className="text-xs text-charcoal-600 mt-1 leading-relaxed">
              Examine candidate evidence signals, inspect normalized score decomposition, and mark findings as false positive / not a threat.
            </p>
          </div>
          <div className="mt-5 pt-3 border-t border-surface-border flex items-center justify-between text-xs font-semibold text-charcoal-800">
            <span>Triage Evidence</span>
            <ChevronRight className="w-4 h-4 text-charcoal-400" />
          </div>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link
          href="/admin/reports"
          className="p-5 rounded-xl bg-white border border-surface-border hover:border-butter-400 shadow-card transition-all flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <FileCheck className="w-5 h-5 text-charcoal-700" />
            <div>
              <h4 className="text-xs font-bold text-charcoal-900">Report Approval & Sharing</h4>
              <p className="text-[11px] text-charcoal-500">Approve finalized audits for owner portals</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-charcoal-400" />
        </Link>

        <Link
          href="/admin/security"
          className="p-5 rounded-xl bg-white border border-surface-border hover:border-butter-400 shadow-card transition-all flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <Activity className="w-5 h-5 text-charcoal-700" />
            <div>
              <h4 className="text-xs font-bold text-charcoal-900">Login Threats & Audit Log</h4>
              <p className="text-[11px] text-charcoal-500">Review brute-force & tamper-evident events</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-charcoal-400" />
        </Link>

        <Link
          href="/admin/sources"
          className="p-5 rounded-xl bg-white border border-surface-border hover:border-butter-400 shadow-card transition-all flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <Server className="w-5 h-5 text-charcoal-700" />
            <div>
              <h4 className="text-xs font-bold text-charcoal-900">Data Sources Operational Status</h4>
              <p className="text-[11px] text-charcoal-500">Inspect adapter configuration & health</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-charcoal-400" />
        </Link>
      </div>
    </div>
  );
}
