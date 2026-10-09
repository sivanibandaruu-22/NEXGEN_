"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import {
  Smartphone,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  ShieldCheck,
  Search,
  Filter,
  Loader2,
  Building2,
  Layers,
  Plus,
} from "lucide-react";

export default function AppStoreMonitoringPage() {
  const [findings, setFindings] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [storeFilter, setStoreFilter] = useState("all");

  const loadData = async () => {
    try {
      setLoading(true);
      const bpRes = await fetch("/api/owner/brand-profile");
      if (bpRes.ok) {
        const bpJson = await bpRes.json();
        setProfile(bpJson);
      }

      const repRes = await fetch("/api/owner/reports");
      if (repRes.ok) {
        const repJson = await repRes.json();
        if (repJson.reports && repJson.reports.length > 0) {
          const latestId = repJson.reports[0].id;
          const detailRes = await fetch(`/api/owner/reports?id=${latestId}`);
          if (detailRes.ok) {
            const detailJson = await detailRes.json();
            const appFindings = (detailJson.report?.findings || []).filter(
              (f: any) => f.category === "app_store"
            );
            setFindings(appFindings);
          }
        }
      }
    } catch (err) {
      console.error("Failed to load app store findings", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredFindings = findings.filter((f) => {
    if (storeFilter === "all") return true;
    return f.platform.toLowerCase() === storeFilter.toLowerCase();
  });

  const officialAppAssets = (profile?.assets || []).filter(
    (a: any) => a.asset_type === "app" && a.is_verified
  );

  return (
    <div>
      <PageHeader
        title="App Store Monitoring"
        description="Continuous mobile app store surveillance across Google Play and Apple App Store. Flags rogue APKs, cloned package identifiers, and unauthorized third-party publisher entities."
        fallbackBackUrl="/owner"
        breadcrumbs={[{ label: "Overview", href: "/owner" }, { label: "App Store Monitoring" }]}
      />

      {/* Official App Exclusion Guarantee Banner */}
      <div className="mb-6 p-4 rounded-xl bg-white border border-surface-border shadow-card">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-800 flex-shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-charcoal-900 uppercase tracking-wider font-mono">
              Verified Application Exclusion Guarantee
            </h3>
            <p className="text-xs text-charcoal-600 mt-0.5 leading-relaxed">
              Official store package identifiers and bundle IDs are excluded from threat flags:
            </p>
            <div className="flex flex-wrap gap-2 mt-2">
              {officialAppAssets.length > 0 ? (
                officialAppAssets.map((a: any) => (
                  <span
                    key={a.id}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-surface-warm border border-surface-border text-xs font-mono font-medium text-charcoal-800"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>[{a.platform}] {a.identifier}</span>
                  </span>
                ))
              ) : (
                <span className="text-xs text-charcoal-400 italic">
                  No verified mobile app assets registered. Add package ID in Brand Profile.
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Store Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2">
          {["all", "play_store", "app_store"].map((s) => (
            <button
              key={s}
              onClick={() => setStoreFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium uppercase tracking-wider transition-colors cursor-pointer ${
                storeFilter === s
                  ? "bg-charcoal-900 text-white font-semibold"
                  : "bg-white text-charcoal-600 hover:bg-surface-warm border border-surface-border"
              }`}
            >
              {s === "all" ? "All Stores" : s === "play_store" ? "Google Play" : "Apple App Store"}
            </button>
          ))}
        </div>
        <span className="text-xs text-charcoal-500 font-mono">
          Showing {filteredFindings.length} rogue application vectors
        </span>
      </div>

      {loading ? (
        <div className="py-20 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-charcoal-400 mb-3" />
          <p className="text-xs text-charcoal-500 font-mono">Loading App Store Findings...</p>
        </div>
      ) : filteredFindings.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-xl border border-surface-border shadow-card">
          <Smartphone className="w-8 h-8 text-charcoal-400 mx-auto mb-2" />
          <p className="text-sm font-semibold text-charcoal-700">No unauthorized app store listings detected</p>
          <p className="text-xs text-charcoal-500 mt-1 max-w-sm mx-auto">
            Submit a monitoring investigation from the Investigations tab to query active store adapters.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredFindings.map((finding) => (
            <div
              key={finding.id}
              className="bg-white rounded-xl border border-surface-border shadow-card p-6 hover:border-butter-400 transition-all"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-surface-border">
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-lg bg-surface-warm border border-surface-border flex items-center justify-center text-charcoal-800 flex-shrink-0">
                    <Smartphone className="w-5 h-5 text-charcoal-700" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-charcoal-900">{finding.target_name}</h3>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-charcoal-900 text-white uppercase">
                        {finding.platform === "play_store" ? "Google Play" : "Apple App Store"}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-charcoal-500">
                      <span>
                        <strong>Package / Bundle ID:</strong>{" "}
                        <code className="text-charcoal-800 font-mono">{finding.target_identifier}</code>
                      </span>
                      <span>&bull;</span>
                      <span>
                        <strong>Publisher:</strong>{" "}
                        <span className="text-charcoal-800 font-medium">{finding.publisher_or_author}</span>
                      </span>
                    </div>
                    {finding.target_url && (
                      <a
                        href={finding.target_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-charcoal-500 hover:underline inline-flex items-center gap-1 mt-1 font-mono"
                      >
                        {finding.target_url} <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
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
                  <div className="text-right pl-3 border-l border-surface-border">
                    <span className="text-[10px] font-mono uppercase text-charcoal-400 block">Confidence</span>
                    <span className="text-xs font-bold font-mono uppercase text-charcoal-800">
                      {finding.confidence}
                    </span>
                  </div>
                </div>
              </div>

              {/* Match indicators */}
              <div className="py-3 border-b border-surface-border/60 flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-charcoal-600">Indicators:</span>
                {finding.matchTypes?.map((mt: string) => (
                  <span
                    key={mt}
                    className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-50 text-rose-800 font-semibold border border-rose-200 uppercase"
                  >
                    {mt.replace("_", " ")}
                  </span>
                ))}
              </div>

              {/* Explainable Evidence Signal Decomposition */}
              {finding.evidence && (
                <div className="pt-4">
                  <h4 className="text-xs font-mono font-bold uppercase text-charcoal-500 mb-2">
                    Evidence & Scoring Traceability
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
                    <strong>Scoring Rationale: </strong>
                    {finding.evidence.rationale}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
