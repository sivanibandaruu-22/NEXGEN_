"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ExternalLink,
  ShieldCheck,
  Search,
  Filter,
  Loader2,
  Info,
} from "lucide-react";

export default function AdminFindingsPage() {
  const searchParams = useSearchParams();
  const initialJobId = searchParams.get("jobId") || "";

  const [findings, setFindings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [triageModal, setTriageModal] = useState<any | null>(null);
  const [triageAction, setTriageAction] = useState<"false_positive" | "dismissed">("false_positive");
  const [triageReason, setTriageReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const loadFindings = async () => {
    try {
      setLoading(true);
      const url = initialJobId
        ? `/api/admin/findings?jobId=${initialJobId}`
        : `/api/admin/findings`;
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        setFindings(json.findings || []);
      }
    } catch (err) {
      console.error("Error loading findings", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFindings();
  }, [initialJobId]);

  const handleTriageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!triageModal) return;
    setActionLoading(true);
    setMessage(null);

    try {
      const res = await fetch("/api/admin/findings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          findingId: triageModal.id,
          status: triageAction,
          reason: triageReason,
        }),
      });

      const resData = await res.json();
      if (res.ok) {
        setMessage({ text: resData.message || "Triage determination recorded.", type: "success" });
        setTriageModal(null);
        setTriageReason("");
        loadFindings();
      } else {
        setMessage({ text: resData.error || "Failed to record determination.", type: "error" });
      }
    } catch {
      setMessage({ text: "Error recording determination.", type: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  const filteredFindings = findings.filter((f) => {
    if (statusFilter === "all") return true;
    return f.status === statusFilter;
  });

  return (
    <div>
      <PageHeader
        title="Findings & Evidence Triage"
        description="Inspect collected candidate evidence, review normalized risk-score explanations, and persist false-positive triage determinations with audit justifications."
        fallbackBackUrl="/admin"
        breadcrumbs={[{ label: "Admin Workspace", href: "/admin" }, { label: "Findings" }]}
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
          <button onClick={() => setMessage(null)} className="font-bold ml-4">
            ×
          </button>
        </div>
      )}

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2">
          {["all", "active", "false_positive", "dismissed"].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium uppercase tracking-wider transition-colors cursor-pointer ${
                statusFilter === s
                  ? "bg-charcoal-900 text-white font-semibold"
                  : "bg-white text-charcoal-600 hover:bg-surface-warm border border-surface-border"
              }`}
            >
              {s.replace("_", " ")}
            </button>
          ))}
        </div>
        <span className="text-xs text-charcoal-500 font-mono">
          Showing {filteredFindings.length} of {findings.length} findings
        </span>
      </div>

      {loading ? (
        <div className="py-20 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-charcoal-400 mb-3" />
          <p className="text-xs text-charcoal-500 font-mono">Loading Findings Queue...</p>
        </div>
      ) : filteredFindings.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-xl border border-surface-border shadow-card">
          <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
          <p className="text-sm font-semibold text-charcoal-700">No findings matching current filter</p>
          <p className="text-xs text-charcoal-500 mt-1">Select another status filter above.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredFindings.map((finding) => (
            <div
              key={finding.id}
              className="bg-white rounded-xl border border-surface-border shadow-card p-6 hover:border-butter-400 transition-all"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-surface-border">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-surface-warm border border-surface-border flex items-center justify-center text-charcoal-800 flex-shrink-0">
                    <AlertTriangle className="w-5 h-5 text-rose-500" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-charcoal-900">{finding.target_name}</h3>
                      <span className="text-xs font-mono text-charcoal-500">
                        ({finding.organization_name} &bull; {finding.matched_brand})
                      </span>
                      {finding.status === "false_positive" ? (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold">
                          FALSE POSITIVE
                        </span>
                      ) : finding.status === "dismissed" ? (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-stone-100 text-stone-700 font-semibold">
                          DISMISSED
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-semibold">
                          ACTIVE THREAT
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-charcoal-500 mt-1 font-mono">
                      <span>[{finding.platform.toUpperCase()}] {finding.target_identifier}</span>
                      {finding.publisher_or_author && (
                        <span>&bull; Publisher: {finding.publisher_or_author}</span>
                      )}
                      {finding.target_url && (
                        <a
                          href={finding.target_url}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:underline text-charcoal-600 inline-flex items-center gap-1"
                        >
                          URL <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className="text-[10px] font-mono uppercase text-charcoal-400 block">Risk Score</span>
                    <span
                      className={`text-xl font-bold font-mono ${
                        finding.risk_score >= 80
                          ? "text-rose-600"
                          : finding.risk_score >= 60
                          ? "text-amber-600"
                          : "text-charcoal-800"
                      }`}
                    >
                      {finding.risk_score} / 100
                    </span>
                  </div>

                  {finding.status === "active" && (
                    <div className="flex items-center gap-2 pl-3 border-l border-surface-border">
                      <button
                        onClick={() => {
                          setTriageModal(finding);
                          setTriageAction("false_positive");
                          setTriageReason("Legitimate fan community / authorized affiliate entity verified by analyst.");
                        }}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 transition-colors cursor-pointer"
                      >
                        Mark False Positive
                      </button>
                      <button
                        onClick={() => {
                          setTriageModal(finding);
                          setTriageAction("dismissed");
                          setTriageReason("Low-severity generic utility. No malicious indicators.");
                        }}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-surface-warm hover:bg-surface-muted text-charcoal-700 border border-surface-border transition-colors cursor-pointer"
                      >
                        Dismiss
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Indicators */}
              <div className="py-3 border-b border-surface-border/60 flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-charcoal-600">Deception Markers:</span>
                {finding.matchTypes?.map((mt: string) => (
                  <span
                    key={mt}
                    className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-warm text-charcoal-800 border border-surface-border uppercase font-medium"
                  >
                    {mt.replace("_", " ")}
                  </span>
                ))}
              </div>

              {/* Evidence Signals Grid */}
              {finding.evidence && (
                <div className="pt-4">
                  <h4 className="text-xs font-mono font-bold uppercase text-charcoal-500 mb-2">
                    Evidence Scoring Telemetry
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                    {finding.evidence.signals?.map((sig: any, idx: number) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded bg-surface-warm border border-surface-border text-xs"
                      >
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-semibold text-charcoal-800">{sig.name}</span>
                          <span className="font-mono text-[11px] font-bold text-charcoal-900">
                            {sig.available ? `${sig.score}/100 (W: ${Math.round(sig.normalizedWeight * 100)}%)` : "UNAVAILABLE"}
                          </span>
                        </div>
                        <p className="text-[11px] text-charcoal-600 leading-normal">{sig.evidenceNotes}</p>
                      </div>
                    ))}
                  </div>

                  <div className="p-3 rounded-lg bg-surface-subtle border border-surface-border text-xs text-charcoal-700">
                    <strong>Rationale: </strong> {finding.evidence.rationale}
                  </div>
                </div>
              )}

              {finding.dismissed_reason && (
                <div className="mt-4 pt-3 border-t border-surface-border text-xs text-charcoal-600 bg-surface-warm p-2.5 rounded">
                  <strong>Recorded Triage Justification: </strong>
                  {finding.dismissed_reason}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Triage Determination Modal */}
      {triageModal && (
        <div className="fixed inset-0 z-50 bg-charcoal-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full border border-surface-border shadow-elevation p-6">
            <h3 className="text-base font-bold text-charcoal-900 mb-1">
              Record Triage Determination: {triageModal.target_name}
            </h3>
            <p className="text-xs text-charcoal-600 mb-4 leading-normal">
              Admin determination will update the audit history and adjust threat classification in reports.
            </p>

            <form onSubmit={handleTriageSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-charcoal-800 mb-1">Determination Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTriageAction("false_positive")}
                    className={`py-2 text-xs font-semibold rounded-lg border text-center cursor-pointer ${
                      triageAction === "false_positive"
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : "bg-surface-warm text-charcoal-700 border-surface-border"
                    }`}
                  >
                    False Positive
                  </button>
                  <button
                    type="button"
                    onClick={() => setTriageAction("dismissed")}
                    className={`py-2 text-xs font-semibold rounded-lg border text-center cursor-pointer ${
                      triageAction === "dismissed"
                        ? "bg-stone-700 text-white border-stone-700"
                        : "bg-surface-warm text-charcoal-700 border-surface-border"
                    }`}
                  >
                    Dismiss
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-charcoal-800 mb-1">
                  Recorded Reason & Justification (Mandatory)
                </label>
                <textarea
                  required
                  rows={3}
                  value={triageReason}
                  onChange={(e) => setTriageReason(e.target.value)}
                  placeholder="Record why this candidate is not considered an active impersonation threat..."
                  className="w-full px-3 py-2 text-xs border border-surface-border rounded-lg bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-surface-border">
                <button
                  type="button"
                  onClick={() => setTriageModal(null)}
                  className="px-3 py-2 text-xs font-medium text-charcoal-700 hover:bg-surface-warm rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading || triageReason.length < 3}
                  className="px-4 py-2 text-xs font-semibold bg-charcoal-900 text-white hover:bg-charcoal-800 disabled:opacity-50 rounded-lg shadow-sm"
                >
                  {actionLoading ? "Recording..." : "Persist Determination"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
