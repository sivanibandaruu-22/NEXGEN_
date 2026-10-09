"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import {
  FileText,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Loader2,
  ShieldCheck,
} from "lucide-react";

export default function OwnerReportsPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedReportId, setExpandedReportId] = useState<string | null>(null);
  const [reportDetail, setReportDetail] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadReports = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/owner/reports");
      if (res.ok) {
        const json = await res.json();
        setReports(json.reports || []);
      }
    } catch (err) {
      console.error("Failed to load reports", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const handleToggleExpand = async (reportId: string) => {
    if (expandedReportId === reportId) {
      setExpandedReportId(null);
      setReportDetail(null);
      return;
    }

    setExpandedReportId(reportId);
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/owner/reports?id=${reportId}`);
      if (res.ok) {
        const json = await res.json();
        setReportDetail(json.report);
      }
    } catch (err) {
      console.error("Failed to fetch report details", err);
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Reports"
        description="Access and download digital risk intelligence reports finalized and shared by platform security analysts."
        fallbackBackUrl="/owner"
        breadcrumbs={[{ label: "Overview", href: "/owner" }, { label: "Reports" }]}
      />

      {loading ? (
        <div className="py-20 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-charcoal-400 mb-3" />
          <p className="text-xs text-charcoal-500 font-mono">Loading Shared Intelligence Reports...</p>
        </div>
      ) : reports.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-xl border border-surface-border shadow-card">
          <FileText className="w-8 h-8 text-charcoal-400 mx-auto mb-2" />
          <p className="text-sm font-semibold text-charcoal-700">No reports shared yet</p>
          <p className="text-xs text-charcoal-500 mt-1 max-w-sm mx-auto">
            Once an administrator finishes reviewing your investigation and finalizes findings, your report will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {reports.map((report) => {
            const summary = report.findingsSummary || {};
            const isExpanded = expandedReportId === report.id;
            const sec = reportDetail?.findingsSummary?.sections || summary.sections || {};

            return (
              <div
                key={report.id}
                className="bg-white rounded-xl border border-surface-border shadow-card p-6 transition-all"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-surface-border">
                  <div className="flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-lg bg-surface-warm border border-surface-border flex items-center justify-center text-charcoal-800 flex-shrink-0">
                      <FileText className="w-5 h-5 text-charcoal-800" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-charcoal-900">{report.title}</h3>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold">
                          SHARED & VERIFIED
                        </span>
                      </div>
                      <p className="text-xs text-charcoal-500 mt-0.5">
                        Shared on {new Date(report.shared_at || report.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* Working Export and Download Buttons */}
                  <div className="flex items-center gap-2">
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

                    <button
                      onClick={() => handleToggleExpand(report.id)}
                      className="p-1.5 text-charcoal-500 hover:text-charcoal-900 rounded-lg hover:bg-surface-warm transition-colors cursor-pointer"
                      title="Toggle detailed findings"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <p className="text-xs text-charcoal-600 mt-4 leading-relaxed">{report.summary}</p>

                {/* Telemetry Metric Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4 pt-4 border-t border-surface-border text-xs">
                  <div className="p-3 rounded-lg bg-surface-warm border border-surface-border">
                    <span className="text-[10px] font-mono uppercase text-charcoal-500 block">
                      Records Analyzed
                    </span>
                    <span className="text-lg font-bold text-charcoal-900">
                      {summary.totalRecordsProcessed || 0}
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-surface-warm border border-surface-border">
                    <span className="text-[10px] font-mono uppercase text-charcoal-500 block">
                      Threat Vectors
                    </span>
                    <span className="text-lg font-bold text-rose-600">
                      {summary.threatFindingsCount || 0}
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-surface-warm border border-surface-border">
                    <span className="text-[10px] font-mono uppercase text-charcoal-500 block">
                      Official Assets Excluded
                    </span>
                    <span className="text-lg font-bold text-emerald-700">
                      {summary.excludedOfficialAssets || 0}
                    </span>
                  </div>
                </div>

                {/* Expanded Findings Section */}
                {isExpanded && (
                  <div className="mt-6 pt-6 border-t border-surface-border space-y-6">
                    {detailLoading ? (
                      <div className="py-8 text-center text-xs text-charcoal-500">
                        <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                        Loading detailed intelligence audit...
                      </div>
                    ) : (
                      <>
                        {/* 10-Section Audit Summary */}
                        {sec.recommendations && (
                          <div className="space-y-4 text-xs">
                            <h4 className="font-mono font-bold uppercase text-charcoal-800 tracking-wider">
                              Executive Audit Recommendations (Section I)
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {sec.recommendations.map((rec: any, idx: number) => (
                                <div key={idx} className="p-3 rounded-lg bg-surface-subtle border border-surface-border">
                                  <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-butter-100 text-charcoal-900 mr-2">
                                    {rec.priority}
                                  </span>
                                  <strong className="text-charcoal-900">{rec.action}</strong>
                                  <p className="text-charcoal-600 text-[11px] mt-1">{rec.rationale}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div>
                          <h4 className="text-xs font-mono font-bold uppercase text-charcoal-700 mb-3 tracking-wider">
                            Verified Threat Telemetry ({reportDetail?.findings?.length || 0} Flagged Findings)
                          </h4>

                          {reportDetail?.findings?.length > 0 ? (
                            <div className="space-y-3">
                              {reportDetail.findings.map((finding: any) => (
                                <div
                                  key={finding.id}
                                  className="p-4 rounded-lg bg-surface-subtle border border-surface-border text-xs"
                                >
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                                    <div className="flex items-center gap-2">
                                      <span className="font-bold text-charcoal-900">{finding.target_name}</span>
                                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-warm uppercase">
                                        {finding.platform}
                                      </span>
                                    </div>
                                    <span
                                      className={`font-mono font-bold ${
                                        finding.risk_score >= 80
                                          ? "text-rose-600"
                                          : finding.risk_score >= 60
                                          ? "text-amber-600"
                                          : "text-charcoal-800"
                                      }`}
                                    >
                                      Risk Score: {finding.risk_score}/100 [{finding.confidence.toUpperCase()}]
                                    </span>
                                  </div>

                                  <p className="text-[11px] text-charcoal-600 font-mono mb-2">
                                    {finding.target_identifier} &bull; {finding.target_url}
                                  </p>

                                  <div className="flex flex-wrap gap-1.5">
                                    {finding.matchTypes?.map((mt: string) => (
                                      <span
                                        key={mt}
                                        className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-rose-50 text-rose-800 border border-rose-200 uppercase"
                                      >
                                        {mt.replace("_", " ")}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-charcoal-500 italic">No active threat findings stored.</p>
                          )}
                        </div>
                      </>
                    )}
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
