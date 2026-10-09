"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import {
  Server,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Clock,
  Info,
  Loader2,
  KeyRound,
} from "lucide-react";

export default function AdminSourcesPage() {
  const [sources, setSources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/sources")
      .then((res) => res.json())
      .then((json) => setSources(json.sources || []))
      .catch((err) => console.error("Error loading sources", err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <PageHeader
        title="Data Sources Operational Status"
        description="Inspect adapter connectivity, API credential status, retrieval timestamps, and integration honesty disclosures."
        fallbackBackUrl="/admin"
        breadcrumbs={[{ label: "Admin Workspace", href: "/admin" }, { label: "Data Sources" }]}
      />

      {/* Honest Boundary Notice */}
      <div className="mb-6 p-4 rounded-xl bg-butter-50 border border-butter-200 text-xs text-charcoal-800 flex items-start gap-3">
        <Info className="w-5 h-5 text-butter-700 flex-shrink-0 mt-0.5" />
        <div>
          <h4 className="font-bold text-charcoal-900 mb-0.5">Integration Honesty Disclosure</h4>
          <p className="leading-relaxed text-charcoal-700">
            Kampus.VC never invents artificial accounts, synthetic engagement metrics, or claims that an unavailable external platform API was queried. When third-party platform keys are unconfigured, adapters operate via documented evaluation fixtures or analyst manual submissions.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-charcoal-400 mb-3" />
          <p className="text-xs text-charcoal-500 font-mono">Loading Adapter Operational Status...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {sources.map((source) => (
            <div
              key={source.id}
              className="bg-white rounded-xl border border-surface-border shadow-card p-6 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-surface-warm border border-surface-border flex items-center justify-center text-charcoal-800">
                      <Server className="w-4 h-4 text-charcoal-700" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-charcoal-900">{source.name}</h3>
                      <span className="text-xs text-charcoal-500">{source.platform}</span>
                    </div>
                  </div>

                  {source.status === "configured" ? (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> CONFIGURED
                    </span>
                  ) : source.status === "fixture" ? (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-butter-200 text-charcoal-900 font-bold">
                      EVALUATION FIXTURE
                    </span>
                  ) : source.status === "manual" ? (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-warm text-charcoal-700 font-bold">
                      MANUAL SUBMISSION
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> UNAVAILABLE
                    </span>
                  )}
                </div>

                <div className="space-y-2 text-xs text-charcoal-600 mb-4">
                  <div className="flex justify-between">
                    <span className="font-semibold text-charcoal-700">Category:</span>
                    <span className="font-mono uppercase">{source.category}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold text-charcoal-700">Telemetry Record Count:</span>
                    <span className="font-mono font-bold text-charcoal-900">{source.recordsCount} candidates</span>
                  </div>
                  {source.lastRetrievalTime && (
                    <div className="flex justify-between">
                      <span className="font-semibold text-charcoal-700">Last Retrieval:</span>
                      <span className="font-mono text-[11px] text-charcoal-500">
                        {new Date(source.lastRetrievalTime).toLocaleTimeString()}
                      </span>
                    </div>
                  )}
                </div>

                {source.failureReason && (
                  <div className="p-2.5 rounded-lg bg-surface-warm border border-surface-border text-xs text-charcoal-600 font-mono mb-2">
                    <strong>Note:</strong> {source.failureReason}
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-surface-border text-[11px] text-charcoal-500 flex items-center justify-between">
                <span>Adapter ID: <code>{source.id}</code></span>
                <span className="text-charcoal-400 font-mono">Status: {source.status}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
