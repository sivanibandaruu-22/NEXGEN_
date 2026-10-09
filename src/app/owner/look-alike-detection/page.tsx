"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/PageHeader";
import {
  Search,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  BarChart3,
  Layers,
  HelpCircle,
  Loader2,
  Info,
} from "lucide-react";

export default function LookalikeDetectionPage() {
  const [candidate, setCandidate] = useState("");
  const [brandName, setBrandName] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Benchmark stats state
  const [benchmark, setBenchmark] = useState<any>(null);
  const [benchmarkLoading, setBenchmarkLoading] = useState(true);

  // Load benchmark metrics & default brand
  useEffect(() => {
    fetch("/api/benchmark")
      .then((res) => res.json())
      .then((data) => setBenchmark(data))
      .catch((err) => console.error("Failed to load benchmark metrics", err))
      .finally(() => setBenchmarkLoading(false));

    fetch("/api/owner/brand-profile")
      .then((res) => res.json())
      .then((data) => {
        if (data?.brandProfile?.brand_name) {
          setBrandName(data.brandProfile.brand_name);
        }
      })
      .catch((err) => console.error("Failed to load profile", err));
  }, []);

  const handleTest = async (testCandidate?: string) => {
    const input = testCandidate || candidate;
    if (!input.trim()) return;

    setLoading(true);
    try {
      const res = await fetch("/api/owner/look-alike-detection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidate: input, brandName }),
      });
      if (res.ok) {
        const json = await res.json();
        setResult(json);
      }
    } catch (err) {
      console.error("Test error", err);
    } finally {
      setLoading(false);
    }
  };

  const presets = [
    { label: "Homoglyph Attack", value: "N\u043Ev\u0430Pay", desc: "Replaces Latin 'o' & 'a' with Cyrillic look-alikes" },
    { label: "Character Transposition", value: "NoavPay", desc: "Swaps adjacent letters 'va' -> 'av'" },
    { label: "Suspicious Suffix", value: "NovaPay_SupportDesk", desc: "Appends high-risk phishing support affix" },
    { label: "Leetspeak Deception", value: "N0vaP@y", desc: "Substitutes numbers '0' and '@'" },
    { label: "Legitimate Alias", value: "Nova Pay", desc: "Known authorized company variation" },
    { label: "Unrelated Name", value: "SuperNova Astro", desc: "Different domain concept sharing substring" },
  ];

  return (
    <div>
      <PageHeader
        title="Look-alike Name Detection"
        description="Deterministic name-normalization and similarity engine handling Unicode homoglyphs, leetspeak, character swaps, delimiters, and suspicious phishing affixes."
        fallbackBackUrl="/owner"
        breadcrumbs={[{ label: "Overview", href: "/owner" }, { label: "Look-alike Name Detection" }]}
      />

      {/* Interactive Testing Workbench */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-xl border border-surface-border shadow-card">
            <h3 className="text-xs font-mono font-bold uppercase text-charcoal-500 mb-3 tracking-wider flex items-center gap-1.5">
              <Search className="w-4 h-4 text-butter-600" />
              Interactive Name Analyzer
            </h3>
            <p className="text-xs text-charcoal-600 mb-4 leading-relaxed">
              Test candidate usernames, domain labels, or store strings against your registered brand identity:
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleTest();
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold text-charcoal-800 mb-1">Target Brand Identity</label>
                <input
                  type="text"
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  placeholder="e.g. NovaPay"
                  className="w-full px-3 py-2 text-xs border border-surface-border rounded-lg bg-surface-warm font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-charcoal-800 mb-1">
                  Candidate String to Inspect
                </label>
                <input
                  type="text"
                  required
                  value={candidate}
                  onChange={(e) => setCandidate(e.target.value)}
                  placeholder="e.g. NоvaPay_Official or NoavPay"
                  className="w-full px-3 py-2 text-xs border border-surface-border rounded-lg bg-white font-mono"
                />
              </div>

              <button
                type="submit"
                disabled={loading || !candidate.trim()}
                className="w-full inline-flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-xs font-semibold bg-butter-400 hover:bg-butter-500 text-charcoal-900 shadow-sm transition-colors cursor-pointer disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                Run Linguistic Analysis
              </button>
            </form>

            {/* Test Presets */}
            <div className="mt-6 pt-4 border-t border-surface-border">
              <span className="text-[11px] font-semibold text-charcoal-700 block mb-2">
                Quick Test Vectors:
              </span>
              <div className="space-y-1.5">
                {presets.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      setCandidate(preset.value);
                      handleTest(preset.value);
                    }}
                    className="w-full text-left p-2 rounded-lg text-xs bg-surface-warm hover:bg-butter-100 transition-colors border border-surface-border/60 flex items-center justify-between cursor-pointer"
                  >
                    <div>
                      <span className="font-bold text-charcoal-900 block">{preset.label}</span>
                      <span className="text-[10px] text-charcoal-500 font-mono">{preset.value}</span>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-charcoal-400" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right 2 Columns: Analysis Results Viewport */}
        <div className="lg:col-span-2">
          {result ? (
            <div className="bg-white rounded-xl border border-surface-border shadow-card p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-surface-border">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-charcoal-500 uppercase tracking-wider font-mono">
                      Candidate:
                    </span>
                    <span className="text-base font-bold text-charcoal-900 font-mono bg-surface-warm px-2 py-0.5 rounded border border-surface-border">
                      {result.candidate}
                    </span>
                    <span className="text-xs text-charcoal-400">vs</span>
                    <span className="text-xs font-bold text-charcoal-800 font-mono">
                      {result.targetBrand}
                    </span>
                  </div>
                  <span className="text-xs text-charcoal-500 mt-1 block">
                    Normalized representation: <code>{result.analysis?.normalizedTarget}</code>
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-[10px] font-mono uppercase text-charcoal-400 block">Similarity</span>
                    <span className="text-lg font-bold text-charcoal-900">
                      {result.analysis?.similarityScore}%
                    </span>
                  </div>
                  <div className="text-right pl-3 border-l border-surface-border">
                    <span className="text-[10px] font-mono uppercase text-charcoal-400 block">Risk Score</span>
                    <span
                      className={`text-lg font-bold ${
                        result.analysis?.riskScore >= 70
                          ? "text-rose-600"
                          : result.analysis?.riskScore >= 40
                          ? "text-amber-600"
                          : "text-emerald-600"
                      }`}
                    >
                      {result.analysis?.riskScore} / 100
                    </span>
                  </div>
                </div>
              </div>

              {/* Status and Match Types */}
              <div className="py-4 border-b border-surface-border flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-charcoal-700">Classification:</span>
                {result.analysis?.isLegitimateAlias ? (
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> AUTHORIZED LEGITIMATE ALIAS
                  </span>
                ) : result.analysis?.riskScore >= 70 ? (
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-800 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" /> HIGH-RISK IMPERSONATION TARGET
                  </span>
                ) : result.analysis?.riskScore >= 40 ? (
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" /> MODERATE SIMILARITY CANDIDATE
                  </span>
                ) : (
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-stone-100 text-stone-700">
                    BENIGN / DISTINCT NAME
                  </span>
                )}

                {result.analysis?.matchTypes?.map((mt: string) => (
                  <span
                    key={mt}
                    className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-warm text-charcoal-700 uppercase border border-surface-border"
                  >
                    {mt.replace("_", " ")}
                  </span>
                ))}
              </div>

              {/* Precise Linguistic Transformations Breakdown */}
              <div className="pt-4">
                <h4 className="text-xs font-mono font-bold uppercase text-charcoal-600 mb-3 tracking-wider">
                  Traceable Deception Transformations
                </h4>
                <div className="space-y-2">
                  {result.analysis?.transformations?.map((t: string, i: number) => (
                    <div
                      key={i}
                      className="p-3 rounded-lg bg-surface-subtle border border-surface-border text-xs flex items-start gap-2.5"
                    >
                      <span className="w-4 h-4 rounded-full bg-butter-200 text-charcoal-900 font-mono text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <span className="text-charcoal-800 font-medium">{t}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center bg-white rounded-xl border border-surface-border shadow-card">
              <Search className="w-8 h-8 text-charcoal-400 mx-auto mb-2" />
              <p className="text-sm font-semibold text-charcoal-700">No candidate analyzed yet</p>
              <p className="text-xs text-charcoal-500 mt-1 max-w-sm mx-auto">
                Type a string or click any of the Quick Test Vectors on the left to see instant linguistic decomposition.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Benchmark Evaluation Matrix Section */}
      <div className="bg-white rounded-xl border border-surface-border shadow-card p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-surface-border mb-6">
          <div>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-charcoal-800" />
              <h3 className="text-sm font-bold text-charcoal-900">
                Look-alike Engine Empirical Benchmark Suite
              </h3>
            </div>
            <p className="text-xs text-charcoal-500 mt-0.5">
              Evaluated against 13 labeled adversarial vectors (homoglyphs, transpositions, legitimate aliases, and unrelated stems)
            </p>
          </div>

          <span className="text-xs font-mono px-2.5 py-1 rounded bg-butter-100 text-charcoal-800 font-semibold border border-butter-300">
            DETERMINISTIC TEST CORPUS
          </span>
        </div>

        {benchmarkLoading ? (
          <div className="py-8 text-center text-xs text-charcoal-500">
            <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
            Computing benchmark precision and recall...
          </div>
        ) : benchmark ? (
          <div>
            {/* Metric KPI cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              <div className="p-4 rounded-lg bg-surface-warm border border-surface-border">
                <span className="text-[10px] font-mono uppercase text-charcoal-500 block">Precision</span>
                <span className="text-2xl font-bold text-charcoal-900">
                  {(benchmark.precision * 100).toFixed(1)}%
                </span>
                <span className="text-[10px] text-charcoal-500 block mt-1">TP / (TP + FP)</span>
              </div>

              <div className="p-4 rounded-lg bg-surface-warm border border-surface-border">
                <span className="text-[10px] font-mono uppercase text-charcoal-500 block">Recall</span>
                <span className="text-2xl font-bold text-charcoal-900">
                  {(benchmark.recall * 100).toFixed(1)}%
                </span>
                <span className="text-[10px] text-charcoal-500 block mt-1">TP / (TP + FN)</span>
              </div>

              <div className="p-4 rounded-lg bg-surface-warm border border-surface-border">
                <span className="text-[10px] font-mono uppercase text-charcoal-500 block">F1 Score</span>
                <span className="text-2xl font-bold text-charcoal-900">
                  {(benchmark.f1Score * 100).toFixed(1)}%
                </span>
                <span className="text-[10px] text-charcoal-500 block mt-1">Harmonic mean</span>
              </div>

              <div className="p-4 rounded-lg bg-surface-warm border border-surface-border">
                <span className="text-[10px] font-mono uppercase text-charcoal-500 block">Accuracy</span>
                <span className="text-2xl font-bold text-charcoal-900">
                  {(benchmark.accuracy * 100).toFixed(1)}%
                </span>
                <span className="text-[10px] text-charcoal-500 block mt-1">{benchmark.totalItems} test vectors</span>
              </div>
            </div>

            {/* Benchmark Test Vectors Table */}
            <div className="overflow-x-auto mb-4 border border-surface-border rounded-lg">
              <table className="w-full text-xs text-left">
                <thead className="bg-surface-subtle text-charcoal-600 font-mono uppercase text-[10px] border-b border-surface-border">
                  <tr>
                    <th className="p-2.5">Vector Description</th>
                    <th className="p-2.5">Expected</th>
                    <th className="p-2.5">Predicted</th>
                    <th className="p-2.5">Risk Score</th>
                    <th className="p-2.5">Outcome</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {benchmark.results?.map((r: any) => (
                    <tr key={r.id} className="hover:bg-surface-subtle/50">
                      <td className="p-2.5 font-medium text-charcoal-900">{r.description}</td>
                      <td className="p-2.5 font-mono uppercase text-[10px]">{r.expected}</td>
                      <td className="p-2.5 font-mono uppercase text-[10px]">{r.predicted}</td>
                      <td className="p-2.5 font-mono">{r.riskScore}/100</td>
                      <td className="p-2.5">
                        {r.passed ? (
                          <span className="text-emerald-700 font-bold font-mono">PASS ✓</span>
                        ) : (
                          <span className="text-rose-700 font-bold font-mono">FAIL ✗</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Required Limitations Disclosure */}
            <div className="p-3 rounded-lg bg-surface-warm border border-surface-border text-xs text-charcoal-600 flex items-start gap-2">
              <Info className="w-4 h-4 text-charcoal-500 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Dataset Size & Operational Limitation Disclosure: </strong>
                {benchmark.limitationsDisclosure}
              </span>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
