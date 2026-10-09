"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import {
  FileCheck,
  Share2,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Loader2,
  Download,
  FileSpreadsheet,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

export default function AdminReportsPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [expandedReportId, setExpandedReportId] = useState<string | null>(null);

  const loadReports = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/reports");
      if (res.ok) {
        const json = await res.json();
        setReports(json.reports || []);
      }
    } catch (err) {
      console.error("Error loading reports", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const handleReportAction = async (reportId: string, action: "approve" | "share" | "reject") => {
    setActionLoading(true);
    setMessage(null);

    try {
      const res = await fetch("/api/admin/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId, action }),
      });

      const resData = await res.json();
      if (res.ok) {
        const actionLabel = action === "share" ? "sent to organization" : `${action}d`;
        setMessage({ text: resData.message || `Report successfully ${actionLabel}.`, type: "success" });
        loadReports();
      } else {
        setMessage({ text: resData.error || `Failed to ${action} report.`, type: "error" });
      }
    } catch {
      setMessage({ text: "Error executing report action.", type: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Reports & Sharing"
        description="Review finalized risk intelligence audits, inspect all 10 structured report sections, and send reports to verified organization owners."
        fallbackBackUrl="/admin"
        breadcrumbs={[{ label: "Admin Workspace", href: "/admin" }, { label: "Reports" }]}
      />

      {message && (
        <div
          className={`mb-6 p-3.5 rounded-lg text-xs flex items-center justify-between border ${
            message.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="font-bold ml-4 cursor-pointer">
            ×
          </button>
        </div>
      )}

      {loading ? (
        <div className="py-20 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-charcoal-400 mb-3" />
          <p className="text-xs text-charcoal-500 font-mono">Loading Reports...</p>
        </div>
      ) : reports.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-xl border border-surface-border shadow-card">
          <FileCheck className="w-8 h-8 text-charcoal-400 mx-auto mb-2" />
          <p className="text-sm font-semibold text-charcoal-700">No reports generated yet</p>
          <p className="text-xs text-charcoal-500 mt-1 max-w-sm mx-auto">
            Once an investigation job finishes executing, a draft report will be created for administrative review and sharing.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {reports.map((report) => {
            const summary = report.findingsSummary || {};
            const sec = summary.sections || {};
            const isShared = report.status === "shared";
            const isApproved = report.status === "approved";
            const isExpanded = expandedReportId === report.id;

            return (
              <div
                key={report.id}
                className="bg-white rounded-xl border border-surface-border shadow-card p-6 hover:border-butter-400 transition-all"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-surface-border">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-surface-warm border border-surface-border flex items-center justify-center text-charcoal-900 flex-shrink-0">
                      <FileCheck className="w-5 h-5 text-charcoal-800" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2.5">
                        <h3 className="text-base font-bold text-charcoal-900">{report.title}</h3>
                        <span className="text-xs font-mono text-charcoal-500">({report.organization_name})</span>
                        {isShared ? (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> SHARED WITH OWNER
                          </span>
                        ) : isApproved ? (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-butter-200 text-charcoal-900 font-semibold">
                            APPROVED (DRAFT)
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-semibold">
                            AWAITING FINAL REVIEW
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-charcoal-500 mt-1">
                        Report ID: <code className="font-mono">{report.id}</code> &bull; Generated:{" "}
                        {new Date(report.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* Admin Review & Share Actions */}
                  <div className="flex flex-wrap items-center gap-2">
                    <a
                      href={`/api/owner/reports/export/pdf?reportId=${report.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-charcoal-900 text-white hover:bg-charcoal-800 transition-colors shadow-sm"
                    >
                      <Download className="w-3.5 h-3.5 text-butter-400" />
                      <span>Download PDF</span>
                    </a>

                    <a
                      href={`/api/owner/reports/export/csv?reportId=${report.id}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-surface-warm hover:bg-surface-muted text-charcoal-700 border border-surface-border transition-colors shadow-sm"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      <span>Export CSV</span>
                    </a>

                    {/* Exact Button: "Send Report to Organization" */}
                    {!isShared && (
                      <button
                        onClick={() => handleReportAction(report.id, "share")}
                        disabled={actionLoading}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shadow-sm cursor-pointer disabled:opacity-50"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        <span>Send Report to Organization</span>
                      </button>
                    )}

                    {!isApproved && !isShared && (
                      <button
                        onClick={() => handleReportAction(report.id, "approve")}
                        disabled={actionLoading}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-surface-warm hover:bg-surface-muted text-charcoal-800 border border-surface-border transition-colors cursor-pointer"
                      >
                        Approve (Internal)
                      </button>
                    )}

                    {isShared && (
                      <span className="text-xs text-emerald-700 font-mono font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Sent on {new Date(report.shared_at).toLocaleDateString()}
                      </span>
                    )}

                    <button
                      onClick={() => setExpandedReportId(isExpanded ? null : report.id)}
                      className="p-1.5 text-charcoal-500 hover:text-charcoal-900 rounded-lg hover:bg-surface-warm transition-colors cursor-pointer"
                      title="Inspect 10 Sections"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <p className="text-xs text-charcoal-600 mt-4 leading-relaxed">{report.summary}</p>

                {/* Telemetry info */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 mt-4 border-t border-surface-border text-xs">
                  <div>
                    <span className="font-semibold text-charcoal-700 block mb-1">Telemetry</span>
                    <p className="text-charcoal-600">
                      {summary.totalRecordsProcessed || 0} candidates analyzed &bull;{" "}
                      {summary.threatFindingsCount || 0} threat vectors flagged
                    </p>
                  </div>

                  <div>
                    <span className="font-semibold text-charcoal-700 block mb-1">Asset Exclusions</span>
                    <p className="text-emerald-700 font-medium">
                      {summary.excludedOfficialAssets || 0} confirmed official properties protected
                    </p>
                  </div>

                  <div>
                    <span className="font-semibold text-charcoal-700 block mb-1">Access Control</span>
                    <p className="text-charcoal-500 font-mono text-[11px]">
                      {isShared
                        ? "Visible in Organization Owner portal"
                        : "Restricted to Admin review workspace"}
                    </p>
                  </div>
                </div>

                {/* 10-SECTION DETAILED AUDIT INSPECTOR */}
                {isExpanded && (
                  <div className="mt-6 pt-6 border-t border-surface-border space-y-5 text-xs">
                    <div className="flex items-center justify-between">
                      <h4 className="font-mono font-bold text-xs uppercase tracking-wider text-charcoal-800">
                        10-Section Intelligence Audit Structure
                      </h4>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-butter-100 text-charcoal-900 font-semibold">
                        FULL PERSISTED REPORT
                      </span>
                    </div>

                    {/* Section A: Executive Summary */}
                    <div className="p-4 rounded-lg bg-surface-subtle border border-surface-border">
                      <span className="font-bold font-mono text-charcoal-900 block mb-1">
                        Section A: Executive Summary
                      </span>
                      <p className="text-charcoal-700 leading-relaxed mb-2">
                        {sec.executiveSummary?.overview || report.summary}
                      </p>
                      <div className="flex gap-4 font-mono text-[11px] text-charcoal-600">
                        <span>Risk Posture: <strong>{sec.executiveSummary?.overallRiskPosture || "HIGH"}</strong></span>
                        <span>Evaluated: <strong>{sec.executiveSummary?.totalRecordsAnalyzed || summary.totalRecordsProcessed || 0} records</strong></span>
                        <span>Threats: <strong>{sec.executiveSummary?.threatFindingsCount || summary.threatFindingsCount || 0}</strong></span>
                      </div>
                    </div>

                    {/* Section B: Brand Reference */}
                    <div className="p-4 rounded-lg bg-surface-subtle border border-surface-border">
                      <span className="font-bold font-mono text-charcoal-900 block mb-1">
                        Section B: Brand Reference Information
                      </span>
                      <div className="grid grid-cols-2 gap-2 text-charcoal-700">
                        <div>Brand: <strong>{sec.brandReference?.brandName || report.brand_name || "N/A"}</strong></div>
                        <div>Organization: <strong>{sec.brandReference?.organizationName || report.organization_name}</strong></div>
                        <div>Primary Domain: <code>{sec.brandReference?.primaryDomain || "N/A"}</code></div>
                        <div>DNS Token: <code>{sec.brandReference?.dnsTxtRecord || "verified"}</code></div>
                      </div>
                    </div>

                    {/* Section C: Social Media Findings */}
                    <div className="p-4 rounded-lg bg-surface-subtle border border-surface-border">
                      <span className="font-bold font-mono text-charcoal-900 block mb-2">
                        Section C: Social Media Monitoring Findings ({sec.socialMediaFindings?.length || 0})
                      </span>
                      {sec.socialMediaFindings && sec.socialMediaFindings.length > 0 ? (
                        <div className="space-y-2">
                          {sec.socialMediaFindings.map((f: any, idx: number) => (
                            <div key={idx} className="p-2.5 rounded bg-white border border-surface-border flex items-center justify-between">
                              <div>
                                <span className="font-semibold text-charcoal-900">{f.targetName}</span>
                                <span className="text-charcoal-500 font-mono ml-2">({f.handle} on {f.platform})</span>
                              </div>
                              <span className="font-mono font-bold text-rose-600">Risk: {f.riskScore}/100</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-charcoal-500 italic">No social threat vectors flagged.</p>
                      )}
                    </div>

                    {/* Section D: App Store Findings */}
                    <div className="p-4 rounded-lg bg-surface-subtle border border-surface-border">
                      <span className="font-bold font-mono text-charcoal-900 block mb-2">
                        Section D: App Store Monitoring Findings ({sec.appStoreFindings?.length || 0})
                      </span>
                      {sec.appStoreFindings && sec.appStoreFindings.length > 0 ? (
                        <div className="space-y-2">
                          {sec.appStoreFindings.map((f: any, idx: number) => (
                            <div key={idx} className="p-2.5 rounded bg-white border border-surface-border flex items-center justify-between">
                              <div>
                                <span className="font-semibold text-charcoal-900">{f.appName}</span>
                                <span className="text-charcoal-500 font-mono ml-2">({f.packageId} &bull; Pub: {f.publisher})</span>
                              </div>
                              <span className="font-mono font-bold text-rose-600">Risk: {f.riskScore}/100</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-charcoal-500 italic">No rogue application packages flagged.</p>
                      )}
                    </div>

                    {/* Section E: Look-alike Name Analysis */}
                    <div className="p-4 rounded-lg bg-surface-subtle border border-surface-border">
                      <span className="font-bold font-mono text-charcoal-900 block mb-2">
                        Section E: Look-alike Name Analysis ({sec.lookalikeAnalysis?.length || 0})
                      </span>
                      {sec.lookalikeAnalysis && sec.lookalikeAnalysis.length > 0 ? (
                        <div className="space-y-2">
                          {sec.lookalikeAnalysis.map((l: any, idx: number) => (
                            <div key={idx} className="p-2.5 rounded bg-white border border-surface-border flex items-center justify-between">
                              <div>
                                <span className="font-mono font-bold text-charcoal-900">{l.candidateName}</span>
                                <p className="text-[11px] text-charcoal-600">{l.transformation}</p>
                              </div>
                              <span className="font-mono text-butter-700 font-semibold">{l.similarityScore}% Sim &bull; Risk: {l.riskScore}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-charcoal-500 italic">No deceptive look-alike names flagged.</p>
                      )}
                    </div>

                    {/* Section F: Risk Assessment */}
                    <div className="p-4 rounded-lg bg-surface-subtle border border-surface-border">
                      <span className="font-bold font-mono text-charcoal-900 block mb-1">
                        Section F: Risk Assessment & Formula
                      </span>
                      <p className="font-mono text-[11px] text-charcoal-700 bg-white p-2 rounded border border-surface-border mb-2">
                        {sec.riskAssessment?.weightsFormula || "Score = (Name × 35%) + (Publisher × 25%) + (Bio × 15%) + (URL × 15%) + (Icon × 10%)"}
                      </p>
                      <p className="text-charcoal-600 text-[11px]">
                        {sec.riskAssessment?.methodology}
                      </p>
                    </div>

                    {/* Section G: Source Execution Summary */}
                    <div className="p-4 rounded-lg bg-surface-subtle border border-surface-border">
                      <span className="font-bold font-mono text-charcoal-900 block mb-2">
                        Section G: Source Execution Summary
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {(sec.sourceExecutionSummary || []).map((s: any, idx: number) => (
                          <div key={idx} className="p-2.5 rounded bg-white border border-surface-border">
                            <span className="font-semibold block">{s.sourceName}</span>
                            <span className="text-[10px] font-mono uppercase text-emerald-700">{s.status}</span>
                            <span className="text-charcoal-500 block text-[11px]">{s.recordsRetrieved} retrieved</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Section H: Official Assets and Exclusions */}
                    <div className="p-4 rounded-lg bg-surface-subtle border border-surface-border">
                      <span className="font-bold font-mono text-charcoal-900 block mb-2">
                        Section H: Official Assets & Immunity Exclusions
                      </span>
                      <p className="text-emerald-800 font-medium mb-1">
                        {summary.excludedOfficialAssets || 0} registered properties protected against threat false-positives
                      </p>
                    </div>

                    {/* Section I: Recommendations */}
                    <div className="p-4 rounded-lg bg-surface-subtle border border-surface-border">
                      <span className="font-bold font-mono text-charcoal-900 block mb-2">
                        Section I: Recommendations
                      </span>
                      <div className="space-y-1.5">
                        {(sec.recommendations || []).map((r: any, idx: number) => (
                          <div key={idx} className="flex items-start gap-2 text-charcoal-700">
                            <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-butter-100 text-charcoal-900">
                              {r.priority}
                            </span>
                            <div>
                              <strong>{r.action}:</strong> {r.rationale}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Section J: Admin Review */}
                    <div className="p-4 rounded-lg bg-surface-subtle border border-surface-border">
                      <span className="font-bold font-mono text-charcoal-900 block mb-1">
                        Section J: Admin Review & Attestation
                      </span>
                      <p className="text-charcoal-600">
                        {sec.adminReview?.notes || "Final risk intelligence report ready for administrative delivery."}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
