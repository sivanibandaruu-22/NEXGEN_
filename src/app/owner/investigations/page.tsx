"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import {
  FolderGit2,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  Loader2,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Server,
} from "lucide-react";
import Link from "next/link";

export default function OwnerInvestigationsPage() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [scope, setScope] = useState<"full" | "social_only" | "app_only">("full");
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const loadJobs = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/owner/investigations");
      if (res.ok) {
        const json = await res.json();
        setJobs(json.jobs || []);
      }
    } catch (err) {
      console.error("Error loading investigations", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJobs();
  }, []);

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setMessage(null);

    try {
      const res = await fetch("/api/owner/investigations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope }),
      });

      const resData = await res.json();
      if (res.ok) {
        setMessage({ text: resData.message || "Request submitted successfully.", type: "success" });
        setShowSubmitModal(false);
        loadJobs();
      } else {
        setMessage({ text: resData.error || "Failed to submit request.", type: "error" });
      }
    } catch {
      setMessage({ text: "Error submitting investigation request.", type: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Investigations"
        description="Submit monitoring investigation requests and track real data-adapter execution jobs across social networks and mobile app stores."
        fallbackBackUrl="/owner"
        breadcrumbs={[{ label: "Overview", href: "/owner" }, { label: "Investigations" }]}
        actions={
          <button
            onClick={() => setShowSubmitModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-charcoal-900 text-white hover:bg-charcoal-800 transition-colors shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4 text-butter-400" />
            <span>Submit Monitoring Request</span>
          </button>
        }
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

      {loading ? (
        <div className="py-20 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-charcoal-400 mb-3" />
          <p className="text-xs text-charcoal-500 font-mono">Loading Investigation Jobs...</p>
        </div>
      ) : jobs.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-xl border border-surface-border shadow-card">
          <FolderGit2 className="w-8 h-8 text-charcoal-400 mx-auto mb-2" />
          <p className="text-sm font-semibold text-charcoal-700">No monitoring investigations on record</p>
          <p className="text-xs text-charcoal-500 mt-1 max-w-sm mx-auto mb-4">
            Submit a monitoring request to initiate real data collection across supported platform adapters.
          </p>
          <button
            onClick={() => setShowSubmitModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-butter-400 hover:bg-butter-500 text-charcoal-900 shadow-sm"
          >
            <Plus className="w-4 h-4" /> Submit Initial Monitoring Request
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {jobs.map((job) => {
            const sourcesRun = JSON.parse(job.sources_run_json || "[]");
            return (
              <div
                key={job.id}
                className="bg-white rounded-xl border border-surface-border shadow-card p-6 hover:border-butter-400 transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-surface-border">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-surface-warm border border-surface-border flex items-center justify-center text-charcoal-900 flex-shrink-0">
                      <FolderGit2 className="w-5 h-5 text-charcoal-800" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-charcoal-900">{job.id}</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-warm text-charcoal-700 uppercase">
                          SCOPE: {job.scope}
                        </span>
                      </div>
                      <p className="text-xs text-charcoal-500 mt-0.5">
                        Requested by {job.requested_by} &bull; {new Date(job.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div>
                    {job.status === "completed" ? (
                      <span className="text-xs font-mono font-bold px-2.5 py-1 rounded bg-emerald-100 text-emerald-800 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" /> COMPLETED
                      </span>
                    ) : job.status === "running" ? (
                      <span className="text-xs font-mono font-bold px-2.5 py-1 rounded bg-butter-200 text-charcoal-900 flex items-center gap-1.5 animate-pulse">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> RUNNING ADAPTERS
                      </span>
                    ) : (
                      <span className="text-xs font-mono font-bold px-2.5 py-1 rounded bg-amber-100 text-amber-800 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" /> PENDING ADMIN APPROVAL
                      </span>
                    )}
                  </div>
                </div>

                {/* Job Execution Telemetry Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 text-xs">
                  <div>
                    <span className="font-semibold text-charcoal-700 block mb-1">Execution Status</span>
                    <p className="text-charcoal-600">
                      {job.records_analyzed > 0
                        ? `${job.records_analyzed} raw candidates processed`
                        : "Awaiting adapter execution by administrator"}
                    </p>
                  </div>

                  <div>
                    <span className="font-semibold text-charcoal-700 block mb-1">Adapters Triggered</span>
                    <div className="flex flex-wrap gap-1">
                      {sourcesRun.length > 0 ? (
                        sourcesRun.map((s: any, idx: number) => (
                          <span
                            key={idx}
                            className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-warm border border-surface-border text-charcoal-700"
                          >
                            {s.adapter} ({s.status})
                          </span>
                        ))
                      ) : (
                        <span className="text-charcoal-400 italic">None executed yet</span>
                      )}
                    </div>
                  </div>

                  <div className="text-right sm:text-right">
                    {job.status === "completed" ? (
                      <Link
                        href="/owner/reports"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-charcoal-900 hover:text-butter-700 underline"
                      >
                        View Reports & Downloads <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    ) : (
                      <span className="text-charcoal-400 text-xs">Report available upon admin review</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Submit Request Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 bg-charcoal-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full border border-surface-border shadow-elevation p-6">
            <h3 className="text-base font-bold text-charcoal-900 mb-1">Submit Monitoring Request</h3>
            <p className="text-xs text-charcoal-600 mb-4 leading-normal">
              Queues a persistent investigation job. The platform administrator validates verified assets before running external adapters.
            </p>

            <form onSubmit={handleSubmitRequest} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-charcoal-800 mb-1">Investigation Scope</label>
                <select
                  value={scope}
                  onChange={(e) => setScope(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs border border-surface-border rounded-lg bg-white"
                >
                  <option value="full">Full Coverage (Social Media + App Store + Look-alikes)</option>
                  <option value="social_only">Social Media Monitoring Only</option>
                  <option value="app_only">App Store Monitoring Only</option>
                </select>
              </div>

              <div className="p-3 rounded-lg bg-surface-warm border border-surface-border text-xs text-charcoal-600">
                <strong>Execution Policy: </strong>
                All confirmed official domains, handles, and package IDs in your Brand Profile are automatically excluded from threat classification.
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-surface-border">
                <button
                  type="button"
                  onClick={() => setShowSubmitModal(false)}
                  className="px-3 py-2 text-xs font-medium text-charcoal-700 hover:bg-surface-warm rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 text-xs font-semibold bg-butter-400 hover:bg-butter-500 text-charcoal-900 rounded-lg shadow-sm"
                >
                  {actionLoading ? "Queueing..." : "Submit to Admin Queue"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
