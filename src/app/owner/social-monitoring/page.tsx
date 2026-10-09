"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import {
  Globe,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  ShieldCheck,
  Search,
  Filter,
  Loader2,
  Layers,
  ArrowRight,
  Plus,
} from "lucide-react";

export default function SocialMonitoringPage() {
  const [findings, setFindings] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [platformFilter, setPlatformFilter] = useState("all");
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualHandle, setManualHandle] = useState("");
  const [manualPlatform, setManualPlatform] = useState("twitter");
  const [manualBio, setManualBio] = useState("");
  const [manualUrl, setManualUrl] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      // Fetch Brand Profile for verified assets
      const bpRes = await fetch("/api/owner/brand-profile");
      if (bpRes.ok) {
        const bpJson = await bpRes.json();
        setProfile(bpJson);
      }

      // Fetch shared reports to get real findings
      const repRes = await fetch("/api/owner/reports");
      if (repRes.ok) {
        const repJson = await repRes.json();
        if (repJson.reports && repJson.reports.length > 0) {
          // Fetch findings for the most recent shared report
          const latestId = repJson.reports[0].id;
          const detailRes = await fetch(`/api/owner/reports?id=${latestId}`);
          if (detailRes.ok) {
            const detailJson = await detailRes.json();
            const socialFindings = (detailJson.report?.findings || []).filter(
              (f: any) => f.category === "social"
            );
            setFindings(socialFindings);
          }
        }
      }
    } catch (err) {
      console.error("Failed to load social monitoring findings", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleManualScan = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setMessage(null);

    try {
      const res = await fetch("/api/owner/look-alike-detection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidate: manualHandle,
          brandName: profile?.brandProfile?.brand_name,
        }),
      });

      if (res.ok) {
        setMessage({
          text: `Analyzed ${manualHandle}: ${res.status === 200 ? "Analysis completed." : ""}`,
          type: "success",
        });
        setShowManualModal(false);
        setManualHandle("");
        loadData();
      }
    } catch {
      setMessage({ text: "Failed to scan manual profile candidate.", type: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  const filteredFindings = findings.filter((f) => {
    if (platformFilter === "all") return true;
    return f.platform.toLowerCase() === platformFilter.toLowerCase();
  });

  const officialSocialAssets = (profile?.assets || []).filter(
    (a: any) => a.asset_type === "social" && a.is_verified
  );

  return (
    <div>
      <PageHeader
        title="Social Media Monitoring"
        description="Surveillance across X, Instagram, Facebook, LinkedIn, and Telegram. Detects look-alike handles, homoglyphs, and fake customer care profiles with verified asset exclusion."
        fallbackBackUrl="/owner"
        breadcrumbs={[{ label: "Overview", href: "/owner" }, { label: "Social Media Monitoring" }]}
        actions={
          <button
            onClick={() => setShowManualModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-charcoal-900 text-white hover:bg-charcoal-800 transition-colors shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4 text-butter-400" />
            <span>Scan Profile Candidate</span>
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

      {/* Verified Official Asset Exclusion Guarantee Banner */}
      <div className="mb-6 p-4 rounded-xl bg-white border border-surface-border shadow-card">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-800 flex-shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-charcoal-900 uppercase tracking-wider font-mono">
              Verified Asset Exclusion Guarantee
            </h3>
            <p className="text-xs text-charcoal-600 mt-0.5 leading-relaxed">
              Your confirmed official accounts are exempted from impersonation alarms before risk scoring:
            </p>
            <div className="flex flex-wrap gap-2 mt-2">
              {officialSocialAssets.length > 0 ? (
                officialSocialAssets.map((a: any) => (
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
                  No verified social assets registered yet. Add them in Brand Profile to ensure exemption.
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Source matrix */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2">
          {["all", "twitter", "instagram", "telegram"].map((p) => (
            <button
              key={p}
              onClick={() => setPlatformFilter(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium uppercase tracking-wider transition-colors cursor-pointer ${
                platformFilter === p
                  ? "bg-charcoal-900 text-white font-semibold"
                  : "bg-white text-charcoal-600 hover:bg-surface-warm border border-surface-border"
              }`}
            >
              {p === "all" ? "All Networks" : p}
            </button>
          ))}
        </div>
        <span className="text-xs text-charcoal-500 font-mono">
          Showing {filteredFindings.length} active threat vectors
        </span>
      </div>

      {loading ? (
        <div className="py-20 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-charcoal-400 mb-3" />
          <p className="text-xs text-charcoal-500 font-mono">Loading Social Media Findings...</p>
        </div>
      ) : filteredFindings.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-xl border border-surface-border shadow-card">
          <Globe className="w-8 h-8 text-charcoal-400 mx-auto mb-2" />
          <p className="text-sm font-semibold text-charcoal-700">No active social impersonators detected</p>
          <p className="text-xs text-charcoal-500 mt-1 max-w-sm mx-auto">
            Run an investigation or manually scan a suspicious profile URL above to evaluate findings.
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
                    <Globe className="w-5 h-5 text-charcoal-700" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-charcoal-900">{finding.target_name}</h3>
                      <span className="text-xs font-mono text-charcoal-600 bg-surface-warm px-2 py-0.5 rounded border border-surface-border">
                        {finding.target_identifier}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-charcoal-900 text-white uppercase">
                        {finding.platform}
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

      {/* Scan Modal */}
      {showManualModal && (
        <div className="fixed inset-0 z-50 bg-charcoal-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full border border-surface-border shadow-elevation p-6">
            <h3 className="text-base font-bold text-charcoal-900 mb-1">Scan Social Profile Candidate</h3>
            <p className="text-xs text-charcoal-600 mb-4 leading-normal">
              Submit a public handle or profile to test for look-alike impersonation markers:
            </p>

            <form onSubmit={handleManualScan} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-charcoal-800 mb-1">Network</label>
                <select
                  value={manualPlatform}
                  onChange={(e) => setManualPlatform(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-surface-border rounded-lg bg-white"
                >
                  <option value="twitter">X / Twitter</option>
                  <option value="instagram">Instagram</option>
                  <option value="telegram">Telegram</option>
                  <option value="facebook">Facebook</option>
                  <option value="linkedin">LinkedIn</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-charcoal-800 mb-1">Handle / Username</label>
                <input
                  type="text"
                  required
                  value={manualHandle}
                  onChange={(e) => setManualHandle(e.target.value)}
                  placeholder="@NovaPay_Care"
                  className="w-full px-3 py-2 text-xs border border-surface-border rounded-lg bg-white font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-surface-border">
                <button
                  type="button"
                  onClick={() => setShowManualModal(false)}
                  className="px-3 py-2 text-xs font-medium text-charcoal-700 hover:bg-surface-warm rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading || !manualHandle.trim()}
                  className="px-4 py-2 text-xs font-semibold bg-butter-400 hover:bg-butter-500 text-charcoal-900 rounded-lg shadow-sm"
                >
                  {actionLoading ? "Scanning..." : "Run Inspection"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
