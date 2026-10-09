"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import {
  FolderGit2,
  Play,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Loader2,
  ChevronRight,
  Server,
  FileCheck,
  XCircle,
  ShieldCheck,
  Circle,
  ExternalLink,
} from "lucide-react";

const INITIAL_STAGES = [
  { id: 1, name: "Validating Brand Profile", status: "pending", details: "Load persisted organization and brand record. Check completeness of registered identifiers." },
  { id: 2, name: "Loading Official Brand Assets", status: "pending", details: "Load official logo, website, domains, social accounts, apps, and aliases." },
  { id: 3, name: "Checking Data Source Availability", status: "pending", details: "Determine which social platforms and app stores are configured." },
  { id: 4, name: "Collecting Available Social Records", status: "pending", details: "Query supported social sources for candidate profiles." },
  { id: 5, name: "Collecting Available App Store Records", status: "pending", details: "Query configured app store adapters for mobile app candidates." },
  { id: 6, name: "Normalizing Names and Identifiers", status: "pending", details: "Normalize Unicode NFKC, spacing, punctuation, and character variations." },
  { id: 7, name: "Checking Look-alike Names", status: "pending", details: "Detect transpositions, homoglyphs, inserted/deleted characters, and deceptive affixes." },
  { id: 8, name: "Comparing Available Logo and Icon Evidence", status: "pending", details: "Evaluate visual identity evidence and declared metadata." },
  { id: 9, name: "Excluding Verified Official Assets", status: "pending", details: "Exempt confirmed official brand assets from threat findings." },
  { id: 10, name: "Calculating Explainable Risk Scores", status: "pending", details: "Apply deterministic weighted model with complete mathematical breakdown." },
  { id: 11, name: "Saving Findings and Evidence", status: "pending", details: "Persist findings to database with structured evidence." },
  { id: 12, name: "Generating Investigation Report", status: "pending", details: "Compile complete 10-section report ready for Admin review." },
];

function AdminInvestigationsContent() {
  const searchParams = useSearchParams();
  const filterOrgId = searchParams.get("orgId");

  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningJobId, setRunningJobId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Investigation Modal State
  const [activeModalJob, setActiveModalJob] = useState<any | null>(null);
  const [modalStages, setModalStages] = useState<any[]>(INITIAL_STAGES);
  const [modalStatus, setModalStatus] = useState<"idle" | "running" | "completed" | "failed">("idle");
  const [modalResult, setModalResult] = useState<any | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);

  const loadJobs = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/investigations");
      if (res.ok) {
        const json = await res.json();
        setJobs(json.jobs || []);
      }
    } catch (err) {
      console.error("Error loading jobs", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJobs();
  }, []);

  const handleStartInvestigation = async (jobOrOrg: { jobId?: string; organizationId?: string; name?: string; brand?: string }) => {
    const jobIdentifier = jobOrOrg.jobId || "new";
    setRunningJobId(jobIdentifier);
    setMessage(null);
    setModalError(null);
    setModalResult(null);
    setModalStatus("running");

    // Initialize stages in modal
    const freshStages = INITIAL_STAGES.map((s) => ({
      ...s,
      status: "pending",
      timestamp: undefined,
      count: undefined,
    }));
    setModalStages(freshStages);
    setActiveModalJob({
      id: jobOrOrg.jobId || "Pending ID",
      name: jobOrOrg.name || "Target Organization",
      brand: jobOrOrg.brand || "Brand Profile",
      organizationId: jobOrOrg.organizationId,
    });

    try {
      // Use NDJSON streaming endpoint
      const res = await fetch("/api/admin/investigations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId: jobOrOrg.jobId,
          organizationId: jobOrOrg.organizationId,
          stream: true,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `HTTP ${res.status} execution failure`);
      }

      const contentType = res.headers.get("Content-Type") || "";

      if (contentType.includes("application/x-ndjson") && res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const msg = JSON.parse(line);
              if (msg.type === "stage" && msg.stage) {
                const updatedStage = msg.stage;
                setModalStages((prev) =>
                  prev.map((s) => (s.id === updatedStage.id ? { ...s, ...updatedStage } : s))
                );
              } else if (msg.type === "done" && msg.result) {
                setModalResult(msg.result);
                setModalStatus("completed");
                setMessage({ text: "Investigation pipeline executed successfully across all 12 stages.", type: "success" });
                loadJobs();
              } else if (msg.type === "error") {
                throw new Error(msg.error || "Investigation stage failed");
              }
            } catch (err: any) {
              if (line.includes('"type":"error"')) {
                throw new Error(err.message || "Pipeline error");
              }
            }
          }
        }
      } else {
        // Fallback for standard JSON response
        const json = await res.json();
        if (json.success && json.result) {
          setModalResult(json.result);
          if (json.result.stages) {
            setModalStages(json.result.stages);
          } else {
            setModalStages((prev) => prev.map((s) => ({ ...s, status: "completed" })));
          }
          setModalStatus("completed");
          setMessage({ text: "Investigation executed successfully.", type: "success" });
          loadJobs();
        } else {
          throw new Error(json.error || "Investigation failed");
        }
      }
    } catch (err: any) {
      console.error("Investigation pipeline failed:", err);
      setModalStatus("failed");
      setModalError(err.message || "Failed to execute investigation pipeline.");
      setMessage({ text: err.message || "Execution failed.", type: "error" });
    } finally {
      setRunningJobId(null);
    }
  };

  const handleOpenExistingJobModal = (job: any) => {
    setActiveModalJob({
      id: job.id,
      name: job.organization_name,
      brand: job.brand_name || "Brand Profile",
      organizationId: job.organization_id,
    });

    let persistedStages: any[] = [];
    try {
      persistedStages = JSON.parse(job.stages_json || "[]");
    } catch {
      persistedStages = [];
    }

    if (persistedStages.length === 12) {
      setModalStages(persistedStages);
    } else {
      setModalStages(
        INITIAL_STAGES.map((s) => ({
          ...s,
          status: job.status === "completed" ? "completed" : "pending",
        }))
      );
    }

    setModalStatus(job.status === "completed" ? "completed" : job.status === "failed" ? "failed" : "idle");
    setModalResult({
      jobId: job.id,
      recordsProcessed: job.records_analyzed,
      findingsCount: 0,
      excludedOfficialCount: 0,
      reportId: undefined,
    });
    setModalError(job.error_log || null);
  };

  const filteredJobs = filterOrgId
    ? jobs.filter((j) => j.organization_id === filterOrgId)
    : jobs;

  const completedStagesCount = modalStages.filter(
    (s) => s.status === "completed" || s.status === "partially_completed"
  ).length;

  return (
    <div>
      <PageHeader
        title="Investigation Jobs"
        description="Execute server-side data adapters, exclude verified official assets, and review 12-stage deterministic risk intelligence pipelines."
        fallbackBackUrl="/admin"
        breadcrumbs={[{ label: "Admin Workspace", href: "/admin" }, { label: "Investigations" }]}
      />

      {filterOrgId && (
        <div className="mb-6 p-4 rounded-xl bg-butter-50 border border-butter-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-charcoal-800">
              Filtered by Organization: <code className="font-mono">{filterOrgId}</code>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleStartInvestigation({ organizationId: filterOrgId })}
              disabled={Boolean(runningJobId)}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-charcoal-900 text-white hover:bg-charcoal-800 transition-colors shadow-sm cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
            >
              <Play className="w-3.5 h-3.5 text-butter-400 fill-butter-400" />
              <span>Launch New Investigation</span>
            </button>
            <Link
              href="/admin/investigations"
              className="text-xs font-medium text-charcoal-600 hover:text-charcoal-900 underline"
            >
              Clear Filter
            </Link>
          </div>
        </div>
      )}

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
      ) : filteredJobs.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-xl border border-surface-border shadow-card">
          <FolderGit2 className="w-8 h-8 text-charcoal-400 mx-auto mb-2" />
          <p className="text-sm font-semibold text-charcoal-700">No investigation jobs queued</p>
          <p className="text-xs text-charcoal-500 mt-1 max-w-sm mx-auto">
            Monitoring requests submitted by organization owners will appear here for review and execution.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredJobs.map((job) => {
            const isPending = job.status === "pending_approval";
            const isCompleted = job.status === "completed";
            const isRunning = runningJobId === job.id || job.status === "running";
            const stagesData = JSON.parse(job.stages_json || "[]");

            return (
              <div
                key={job.id}
                className="bg-white rounded-xl border border-surface-border shadow-card p-6 hover:border-butter-400 transition-all"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-surface-border">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-surface-warm border border-surface-border flex items-center justify-center text-charcoal-900 flex-shrink-0">
                      <FolderGit2 className="w-5 h-5 text-charcoal-800" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2.5">
                        <h3 className="text-base font-bold text-charcoal-900">
                          {job.organization_name} &bull; {job.brand_name || "Brand"}
                        </h3>
                        <span className="text-xs font-mono text-charcoal-500">({job.id})</span>
                        {isCompleted ? (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> COMPLETED (12/12)
                          </span>
                        ) : isPending ? (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-semibold flex items-center gap-1">
                            <Clock className="w-3 h-3" /> PENDING REVIEW
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-butter-200 text-charcoal-900 font-semibold flex items-center gap-1 animate-pulse">
                            <Loader2 className="w-3 h-3 animate-spin" /> RUNNING
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-charcoal-500 mt-1">
                        Scope: <span className="font-mono uppercase font-semibold">{job.scope}</span> &bull;
                        Requested by: {job.requested_by} &bull; Created:{" "}
                        {new Date(job.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div>
                    {isPending ? (
                      <button
                        onClick={() =>
                          handleStartInvestigation({
                            jobId: job.id,
                            organizationId: job.organization_id,
                            name: job.organization_name,
                            brand: job.brand_name,
                          })
                        }
                        disabled={isRunning}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-charcoal-900 text-white hover:bg-charcoal-800 disabled:opacity-50 transition-colors shadow-sm cursor-pointer"
                      >
                        {isRunning ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-butter-400" />
                            Executing 12 Stages...
                          </>
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5 text-butter-400 fill-butter-400" />
                            Approve & Run Investigation
                          </>
                        )}
                      </button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenExistingJobModal(job)}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-surface-warm hover:bg-surface-muted text-charcoal-800 border border-surface-border transition-colors cursor-pointer"
                        >
                          View 12 Stages
                        </button>
                        <Link
                          href={`/admin/findings?jobId=${job.id}`}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-surface-warm hover:bg-surface-muted text-charcoal-800 border border-surface-border transition-colors"
                        >
                          Review Findings
                        </Link>
                        <Link
                          href="/admin/reports"
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-charcoal-900 text-white hover:bg-charcoal-800 transition-colors"
                        >
                          Reports
                        </Link>
                      </div>
                    )}
                  </div>
                </div>

                {/* Telemetry info */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 text-xs">
                  <div>
                    <span className="font-semibold text-charcoal-700 block mb-1">Processed Telemetry</span>
                    <p className="text-charcoal-600">
                      {job.records_analyzed > 0
                        ? `${job.records_analyzed} candidates collected and evaluated`
                        : "Awaiting execution"}
                    </p>
                  </div>

                  <div>
                    <span className="font-semibold text-charcoal-700 block mb-1">Stages Completed</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-emerald-700 font-bold">
                        {stagesData.length > 0 ? `${stagesData.filter((s: any) => s.status === "completed").length}/12` : isCompleted ? "12/12" : "0/12"}
                      </span>
                      <span className="text-charcoal-500 text-[11px]">processing milestones</span>
                    </div>
                  </div>

                  <div>
                    <span className="font-semibold text-charcoal-700 block mb-1">Execution Status</span>
                    <p className="text-charcoal-500 font-mono text-[11px]">
                      {job.completed_at
                        ? `Finished ${new Date(job.completed_at).toLocaleTimeString()}`
                        : "Ready for administrator approval"}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* VISIBLE CENTERED INVESTIGATION PROGRESS MODAL (12 REAL STAGES)             */}
      {/* ========================================================================= */}
      {activeModalJob && (
        <div className="fixed inset-0 z-50 bg-charcoal-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white rounded-xl shadow-2xl border border-surface-border overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-6 border-b border-surface-border bg-white flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-charcoal-900">
                    Investigation Pipeline Execution
                  </h3>
                  {modalStatus === "running" ? (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-butter-200 text-charcoal-900 font-semibold flex items-center gap-1 animate-pulse">
                      <Loader2 className="w-3 h-3 animate-spin" /> RUNNING STAGES
                    </span>
                  ) : modalStatus === "completed" ? (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> PIPELINE COMPLETE
                    </span>
                  ) : modalStatus === "failed" ? (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-semibold flex items-center gap-1">
                      <XCircle className="w-3 h-3" /> PIPELINE FAILED
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-stone-100 text-stone-700 font-semibold">
                      ARCHIVED EXECUTION
                    </span>
                  )}
                </div>
                <p className="text-xs text-charcoal-500 mt-1">
                  Target: <strong>{activeModalJob.brand}</strong> &bull; {activeModalJob.name} &bull; Job ID:{" "}
                  <code className="font-mono">{activeModalJob.id}</code>
                </p>
              </div>

              {modalStatus !== "running" && (
                <button
                  onClick={() => setActiveModalJob(null)}
                  className="text-charcoal-400 hover:text-charcoal-900 text-xl font-bold p-1 cursor-pointer"
                >
                  &times;
                </button>
              )}
            </div>

            {/* Progress Bar & Stage Counter */}
            <div className="px-6 py-3 bg-surface-subtle border-b border-surface-border flex items-center justify-between text-xs">
              <span className="font-mono text-charcoal-600 font-medium">
                Stage {completedStagesCount} of 12 Completed
              </span>
              <div className="w-48 h-2 rounded-full bg-surface-warm overflow-hidden border border-surface-border">
                <div
                  className="h-full bg-butter-500 transition-all duration-300"
                  style={{ width: `${(completedStagesCount / 12) * 100}%` }}
                />
              </div>
            </div>

            {/* Modal Body: The 12 Stages List */}
            <div className="p-6 overflow-y-auto space-y-3 divide-y divide-surface-border/50 text-xs">
              {modalStages.map((stage) => {
                const isPending = stage.status === "pending";
                const isRunning = stage.status === "running";
                const isDone = stage.status === "completed";
                const isPartial = stage.status === "partially_completed" || stage.status === "unavailable";
                const isFailed = stage.status === "failed";

                return (
                  <div key={stage.id} className="pt-3 first:pt-0 flex items-start gap-3">
                    <div className="mt-0.5 flex-shrink-0">
                      {isRunning ? (
                        <Loader2 className="w-4 h-4 animate-spin text-charcoal-900" />
                      ) : isDone ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : isPartial ? (
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                      ) : isFailed ? (
                        <XCircle className="w-4 h-4 text-rose-600" />
                      ) : (
                        <Circle className="w-4 h-4 text-charcoal-300" />
                      )}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`font-semibold ${
                            isRunning
                              ? "text-charcoal-900 font-bold"
                              : isDone
                              ? "text-charcoal-900"
                              : "text-charcoal-500"
                          }`}
                        >
                          {stage.id}. {stage.name}
                        </span>

                        <span
                          className={`text-[10px] font-mono px-1.5 py-0.5 rounded uppercase ${
                            isRunning
                              ? "bg-butter-100 text-charcoal-900 font-bold animate-pulse"
                              : isDone
                              ? "bg-emerald-50 text-emerald-800 font-semibold"
                              : isPartial
                              ? "bg-amber-50 text-amber-800"
                              : isFailed
                              ? "bg-rose-50 text-rose-800"
                              : "text-charcoal-400"
                          }`}
                        >
                          {stage.status.replace("_", " ")}
                        </span>
                      </div>

                      <p className="text-[11px] text-charcoal-600 mt-0.5 leading-relaxed">
                        {stage.details}
                      </p>

                      {stage.count !== undefined && stage.count > 0 && (
                        <span className="text-[10px] text-charcoal-500 font-mono mt-0.5 block">
                          Telemetry metric: {stage.count} entities processed
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Error Display if Failed */}
            {modalError && (
              <div className="mx-6 mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                <strong>Pipeline Error:</strong> {modalError}
              </div>
            )}

            {/* Modal Footer */}
            <div className="p-6 border-t border-surface-border bg-surface-subtle flex flex-col sm:flex-row items-center justify-between gap-4">
              {modalStatus === "completed" && modalResult ? (
                <>
                  <div className="text-xs text-charcoal-700">
                    <span className="font-bold text-emerald-700 block">
                      Pipeline Complete: {modalResult.recordsProcessed || 0} candidates analyzed
                    </span>
                    <span className="text-[11px] text-charcoal-500">
                      {modalResult.findingsCount || 0} threats flagged &bull;{" "}
                      {modalResult.excludedOfficialCount || 0} official properties protected
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link
                      href={`/admin/findings?jobId=${modalResult.jobId || activeModalJob.id}`}
                      className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-charcoal-900 text-white hover:bg-charcoal-800 transition-colors shadow-sm"
                    >
                      Review Findings →
                    </Link>
                    <Link
                      href="/admin/reports"
                      className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-butter-400 text-charcoal-900 hover:bg-butter-500 transition-colors shadow-sm"
                    >
                      Finalize Report
                    </Link>
                    <button
                      onClick={() => setActiveModalJob(null)}
                      className="px-3 py-2 rounded-lg text-xs font-medium text-charcoal-600 hover:text-charcoal-900 cursor-pointer"
                    >
                      Dismiss
                    </button>
                  </div>
                </>
              ) : modalStatus === "failed" ? (
                <>
                  <span className="text-xs text-rose-700">Stage failure encountered during execution.</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        handleStartInvestigation({
                          jobId: activeModalJob.id,
                          organizationId: activeModalJob.organizationId,
                          name: activeModalJob.name,
                          brand: activeModalJob.brand,
                        })
                      }
                      className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-rose-600 text-white hover:bg-rose-700 transition-colors cursor-pointer"
                    >
                      Retry Pipeline
                    </button>
                    <button
                      onClick={() => setActiveModalJob(null)}
                      className="px-3 py-2 rounded-lg text-xs font-medium text-charcoal-600 hover:text-charcoal-900 cursor-pointer"
                    >
                      Close
                    </button>
                  </div>
                </>
              ) : modalStatus === "running" ? (
                <div className="w-full text-center text-xs text-charcoal-500 flex items-center justify-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-charcoal-700" />
                  <span>Processing live platform adapters and executing detection engines...</span>
                </div>
              ) : (
                <div className="w-full flex justify-end">
                  <button
                    onClick={() => setActiveModalJob(null)}
                    className="px-4 py-2 rounded-lg text-xs font-semibold bg-charcoal-900 text-white hover:bg-charcoal-800 cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminInvestigationsPage() {
  return (
    <Suspense
      fallback={
        <div className="py-20 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-charcoal-400 mb-3" />
          <p className="text-xs text-charcoal-500 font-mono">Loading Investigation Center...</p>
        </div>
      }
    >
      <AdminInvestigationsContent />
    </Suspense>
  );
}
