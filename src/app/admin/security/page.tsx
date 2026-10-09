"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import {
  Activity,
  ShieldAlert,
  AlertTriangle,
  Lock,
  Clock,
  CheckCircle2,
  Filter,
  Loader2,
  FileText,
  User,
} from "lucide-react";

export default function AdminSecurityPage() {
  const [data, setData] = useState<{ events: any[]; auditLogs: any[] }>({ events: [], auditLogs: [] });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"threats" | "audit">("threats");

  useEffect(() => {
    fetch("/api/admin/security")
      .then((res) => res.json())
      .then((json) => setData(json))
      .catch((err) => console.error("Error loading security events", err))
      .finally(() => setLoading(false));
  }, []);

  const events = data.events || [];
  const auditLogs = data.auditLogs || [];

  const failedLogins = events.filter((e) => e.event_type === "failed_login").length;
  const rateLimitEvents = events.filter((e) => e.event_type === "rate_limit_exceeded").length;

  return (
    <div>
      <PageHeader
        title="Login Threat Detection & Audit Records"
        description="Monitor authentication anomalies, brute-force probes, rate-limit threshold breaches, and inspect tamper-evident audit logs."
        fallbackBackUrl="/admin"
        breadcrumbs={[{ label: "Admin Workspace", href: "/admin" }, { label: "Security & Audit" }]}
      />

      {/* KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div className="p-4 rounded-xl bg-white border border-surface-border shadow-card">
          <span className="text-[10px] font-mono font-bold uppercase text-charcoal-500 block">Total Threat Events</span>
          <span className="text-2xl font-bold text-charcoal-900 mt-1 block">{events.length}</span>
          <span className="text-[10px] text-charcoal-500 block mt-1">Logged security events</span>
        </div>

        <div className="p-4 rounded-xl bg-white border border-surface-border shadow-card">
          <span className="text-[10px] font-mono font-bold uppercase text-charcoal-500 block">Failed Authentications</span>
          <span className="text-2xl font-bold text-amber-600 mt-1 block">{failedLogins}</span>
          <span className="text-[10px] text-charcoal-500 block mt-1">Credential check failures</span>
        </div>

        <div className="p-4 rounded-xl bg-white border border-surface-border shadow-card">
          <span className="text-[10px] font-mono font-bold uppercase text-charcoal-500 block">Rate-Limit Triggers</span>
          <span className="text-2xl font-bold text-rose-600 mt-1 block">{rateLimitEvents}</span>
          <span className="text-[10px] text-charcoal-500 block mt-1">Throttled probes (5/min)</span>
        </div>

        <div className="p-4 rounded-xl bg-white border border-surface-border shadow-card">
          <span className="text-[10px] font-mono font-bold uppercase text-charcoal-500 block">Audit Records</span>
          <span className="text-2xl font-bold text-charcoal-900 mt-1 block">{auditLogs.length}</span>
          <span className="text-[10px] text-charcoal-500 block mt-1">Append-only administrative actions</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-6 border-b border-surface-border pb-3">
        <button
          onClick={() => setActiveTab("threats")}
          className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
            activeTab === "threats"
              ? "bg-charcoal-900 text-white shadow-xs"
              : "bg-white text-charcoal-600 hover:bg-surface-warm border border-surface-border"
          }`}
        >
          Login Threat Events ({events.length})
        </button>
        <button
          onClick={() => setActiveTab("audit")}
          className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
            activeTab === "audit"
              ? "bg-charcoal-900 text-white shadow-xs"
              : "bg-white text-charcoal-600 hover:bg-surface-warm border border-surface-border"
          }`}
        >
          System Audit Trail ({auditLogs.length})
        </button>
      </div>

      {loading ? (
        <div className="py-20 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-charcoal-400 mb-3" />
          <p className="text-xs text-charcoal-500 font-mono">Loading Security Telemetry...</p>
        </div>
      ) : activeTab === "threats" ? (
        events.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-xl border border-surface-border shadow-card">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
            <p className="text-sm font-semibold text-charcoal-700">No login security threats detected</p>
          </div>
        ) : (
          <div className="space-y-3">
            {events.map((event) => (
              <div
                key={event.id}
                className="bg-white rounded-xl border border-surface-border shadow-card p-5 hover:border-butter-400 transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-surface-border">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                        event.severity === "high" || event.severity === "critical"
                          ? "bg-rose-100 text-rose-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {event.severity} SEVERITY
                    </span>
                    <span className="font-bold text-xs text-charcoal-900 font-mono">
                      {event.event_type.replace("_", " ").toUpperCase()}
                    </span>
                    {event.email && (
                      <span className="text-xs text-charcoal-600 font-mono">
                        Target: {event.email}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-charcoal-400 font-mono">
                    {new Date(event.created_at).toLocaleString()}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 text-xs">
                  <div>
                    <span className="text-charcoal-500 block text-[10px] font-mono">ORIGIN IP</span>
                    <span className="font-mono text-charcoal-800 font-medium">{event.ip_address || "127.0.0.1"}</span>
                  </div>
                  <div>
                    <span className="text-charcoal-500 block text-[10px] font-mono">USER AGENT</span>
                    <span className="font-mono text-charcoal-800 truncate block text-[11px]">
                      {event.user_agent || "N/A"}
                    </span>
                  </div>
                  <div>
                    <span className="text-charcoal-500 block text-[10px] font-mono">REMEDIATION GUIDANCE</span>
                    <span className="text-charcoal-700 text-[11px]">
                      {event.event_type === "rate_limit_exceeded"
                        ? "Temporary IP throttle enforced. Consider firewall rate-limiting."
                        : "Verify account owner if multiple failures persist."}
                    </span>
                  </div>
                </div>

                {event.details && (
                  <div className="mt-3 p-2 rounded bg-surface-warm font-mono text-[11px] text-charcoal-600 border border-surface-border">
                    {JSON.stringify(event.details)}
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      ) : (
        /* Audit Trail Table */
        <div className="bg-white rounded-xl border border-surface-border shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-surface-subtle text-charcoal-600 font-mono uppercase text-[10px] border-b border-surface-border">
                <tr>
                  <th className="p-3">Timestamp</th>
                  <th className="p-3">Actor / Role</th>
                  <th className="p-3">Action</th>
                  <th className="p-3">Resource</th>
                  <th className="p-3">Metadata</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border font-mono text-[11px]">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-surface-subtle/50">
                    <td className="p-3 text-charcoal-500 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleTimeString()}
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      <span className="font-bold text-charcoal-900">{log.actor_role || "SYSTEM"}</span>
                      <span className="text-charcoal-400 block text-[10px]">{log.actor_id || "system"}</span>
                    </td>
                    <td className="p-3 font-semibold text-charcoal-800 whitespace-nowrap">
                      {log.action}
                    </td>
                    <td className="p-3 text-charcoal-600 whitespace-nowrap">
                      {log.resource_type}: {log.resource_id}
                    </td>
                    <td className="p-3 text-charcoal-500 truncate max-w-xs">
                      {JSON.stringify(log.metadata)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
