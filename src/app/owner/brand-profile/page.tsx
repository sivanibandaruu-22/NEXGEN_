"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import {
  ShieldCheck,
  Globe,
  Smartphone,
  Share2,
  Plus,
  Trash2,
  Copy,
  CheckCircle2,
  AlertCircle,
  Clock,
  ExternalLink,
  Loader2,
  Upload,
} from "lucide-react";

export default function OwnerBrandProfilePage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // New asset form state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newAsset, setNewAsset] = useState({
    assetType: "domain" as "domain" | "social" | "app" | "alias",
    platform: "web",
    identifier: "",
    url: "",
  });

  const loadProfile = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/owner/brand-profile");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error("Failed to load brand profile", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setMessage({ text: "Copied verification record to clipboard!", type: "success" });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleAddAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setMessage(null);

    try {
      const res = await fetch("/api/owner/brand-profile/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newAsset),
      });

      const resData = await res.json();
      if (!res.ok) {
        setMessage({ text: resData.error || "Failed to add asset.", type: "error" });
      } else {
        setMessage({ text: "Official asset added successfully.", type: "success" });
        setShowAddModal(false);
        setNewAsset({ assetType: "domain", platform: "web", identifier: "", url: "" });
        loadProfile();
      }
    } catch {
      setMessage({ text: "Error submitting asset.", type: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteAsset = async (assetId: string) => {
    if (!confirm("Are you sure you want to remove this official asset?")) return;
    try {
      const res = await fetch(`/api/owner/brand-profile/assets?id=${assetId}`, { method: "DELETE" });
      if (res.ok) {
        setMessage({ text: "Asset removed successfully.", type: "success" });
        loadProfile();
      }
    } catch {
      setMessage({ text: "Error removing asset.", type: "error" });
    }
  };

  const handleSubmitChallenge = async () => {
    setActionLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/owner/brand-profile/verify-challenge", { method: "POST" });
      const resData = await res.json();
      if (res.ok) {
        setMessage({ text: resData.message || "Verification submitted.", type: "success" });
        loadProfile();
      } else {
        setMessage({ text: resData.error || "Failed to submit challenge.", type: "error" });
      }
    } catch {
      setMessage({ text: "Error submitting verification challenge.", type: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-charcoal-400 mb-3" />
        <p className="text-xs text-charcoal-500 font-mono">Loading Brand Profile...</p>
      </div>
    );
  }

  const org = data?.organization;
  const bp = data?.brandProfile;
  const assets: any[] = data?.assets || [];

  return (
    <div>
      <PageHeader
        title="Brand Profile"
        description="Official brand identity catalog, registered domains, verified social accounts, store packages, and DNS verification challenges."
        fallbackBackUrl="/owner"
        breadcrumbs={[{ label: "Overview", href: "/owner" }, { label: "Brand Profile" }]}
        actions={
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-charcoal-900 text-white hover:bg-charcoal-800 transition-colors shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4 text-butter-400" />
            <span>Add Official Asset</span>
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

      {/* Verification Status Banner */}
      <div className="mb-6 p-4 rounded-xl border border-surface-border bg-white shadow-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            {org?.verification_status === "verified" ? (
              <div className="w-10 h-10 rounded-lg bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-800 flex-shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            ) : org?.verification_status === "pending_verification" ? (
              <div className="w-10 h-10 rounded-lg bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-800 flex-shrink-0">
                <Clock className="w-5 h-5" />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-lg bg-stone-100 border border-stone-300 flex items-center justify-center text-stone-800 flex-shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-charcoal-900">
                  Verification Status:{" "}
                  <span className="uppercase font-mono text-xs">
                    {org?.verification_status?.replace("_", " ")}
                  </span>
                </h3>
              </div>
              <p className="text-xs text-charcoal-600 mt-1 max-w-2xl leading-relaxed">
                {org?.verification_status === "verified"
                  ? `Officially validated by Kampus Risk Lead. All submitted domains, store IDs, and social handles are excluded from impersonation alarms.`
                  : org?.verification_status === "pending_verification"
                  ? `Your DNS TXT records and brand identity are currently queued for Admin review.`
                  : `Please configure your DNS TXT challenge token on ${bp?.primary_domain} and submit for validation.`}
              </p>
              {org?.verification_reason && (
                <div className="mt-2 text-xs font-mono bg-surface-warm p-2 rounded border border-surface-border text-charcoal-700">
                  <strong>Admin Note:</strong> {org.verification_reason}
                </div>
              )}
            </div>
          </div>

          {org?.verification_status !== "verified" && (
            <button
              onClick={handleSubmitChallenge}
              disabled={actionLoading || org?.verification_status === "pending_verification"}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-butter-400 hover:bg-butter-500 text-charcoal-900 disabled:opacity-50 transition-colors shadow-sm flex-shrink-0 cursor-pointer"
            >
              {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
              {org?.verification_status === "pending_verification" ? "In Admin Queue" : "Submit for Verification"}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Brand Identity Card & DNS Challenge */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-xl border border-surface-border shadow-card">
            <h3 className="text-xs font-mono font-bold uppercase text-charcoal-500 mb-4 tracking-wider">
              Brand Identity
            </h3>

            <div className="flex items-center gap-4 mb-4">
              {bp?.logo_url ? (
                <img
                  src={bp.logo_url}
                  alt={bp.brand_name}
                  className="w-14 h-14 rounded-lg object-cover border border-surface-border"
                />
              ) : (
                <div className="w-14 h-14 rounded-lg bg-butter-100 border border-butter-300 flex items-center justify-center font-bold text-charcoal-800 text-lg">
                  {bp?.brand_name?.charAt(0) || "B"}
                </div>
              )}
              <div>
                <h2 className="text-lg font-bold text-charcoal-900">{bp?.brand_name}</h2>
                <span className="text-xs text-charcoal-500">{org?.name}</span>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="font-semibold text-charcoal-700 block">Industry</span>
                <span className="text-charcoal-600">{bp?.industry}</span>
              </div>
              <div>
                <span className="font-semibold text-charcoal-700 block">Primary Domain</span>
                <a
                  href={`https://${bp?.primary_domain}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-charcoal-900 underline inline-flex items-center gap-1 font-mono hover:text-butter-700"
                >
                  {bp?.primary_domain} <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <div>
                <span className="font-semibold text-charcoal-700 block">Purpose & Description</span>
                <p className="text-charcoal-600 leading-relaxed mt-0.5">{bp?.description}</p>
              </div>
            </div>
          </div>

          {/* DNS TXT Record Challenge */}
          <div className="bg-white p-6 rounded-xl border border-surface-border shadow-card">
            <h3 className="text-xs font-mono font-bold uppercase text-charcoal-500 mb-2 tracking-wider">
              Domain Ownership Challenge
            </h3>
            <p className="text-xs text-charcoal-600 mb-4 leading-relaxed">
              Add this TXT record to your root DNS zone to cryptographically verify domain control:
            </p>

            <div className="space-y-2 mb-4 font-mono text-xs">
              <div className="p-2.5 rounded-lg bg-surface-warm border border-surface-border">
                <span className="text-[10px] text-charcoal-400 block mb-1">RECORD TYPE: TXT</span>
                <div className="flex items-center justify-between">
                  <span className="break-all font-semibold text-charcoal-900">{bp?.dns_txt_record}</span>
                  <button
                    onClick={() => handleCopy(bp?.dns_txt_record)}
                    className="p-1 hover:bg-surface-muted rounded text-charcoal-600"
                    title="Copy record"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-surface-subtle border border-surface-border text-[11px] text-charcoal-600">
              <span className="font-bold text-charcoal-800 block mb-1">Alternative HTTP Challenge:</span>
              Serve at <code>https://{bp?.primary_domain}/.well-known/kampus-challenge.txt</code>
            </div>
          </div>
        </div>

        {/* Right Column: Official Social Accounts & Assets Catalog */}
        <div className="lg:col-span-2 space-y-6">
          {/* Dedicated Official Social Accounts Card */}
          <div className="bg-white rounded-xl border border-surface-border shadow-card overflow-hidden">
            <div className="px-6 py-4 border-b border-surface-border flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-charcoal-900">Official Social Media Profiles</h3>
                <p className="text-xs text-charcoal-500">
                  Registered handles are automatically excluded from impersonation threat scans.
                </p>
              </div>
              <button
                onClick={() => {
                  setNewAsset({ assetType: "social", platform: "twitter", identifier: "", url: "" });
                  setShowAddModal(true);
                }}
                className="text-xs font-semibold text-charcoal-900 hover:text-butter-700 underline inline-flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Connect Social
              </button>
            </div>

            <div className="divide-y divide-surface-border">
              {[
                { key: "twitter", label: "X / Twitter", altKey: "x" },
                { key: "instagram", label: "Instagram" },
                { key: "facebook", label: "Facebook" },
                { key: "linkedin", label: "LinkedIn" },
                { key: "youtube", label: "YouTube" },
              ].map((plat) => {
                const match = assets.find(
                  (a) =>
                    (a.asset_type === "social" || a.assetType === "social") &&
                    (a.platform?.toLowerCase() === plat.key || (plat.altKey && a.platform?.toLowerCase() === plat.altKey))
                );

                return (
                  <div key={plat.key} className="p-4 flex items-center justify-between hover:bg-surface-subtle/40 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-surface-warm border border-surface-border flex items-center justify-center text-charcoal-700 flex-shrink-0">
                        <Share2 className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-charcoal-900">{plat.label}</span>
                          {match ? (
                            <>
                              <span className="text-xs font-mono font-bold text-charcoal-800">
                                {match.identifier}
                              </span>
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold">
                                VERIFIED EXCLUSION
                              </span>
                            </>
                          ) : (
                            <span className="text-[11px] text-charcoal-400 italic">Not configured</span>
                          )}
                        </div>
                        {match?.url && (
                          <a
                            href={match.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[11px] text-charcoal-500 hover:underline flex items-center gap-1 mt-0.5"
                          >
                            {match.url} <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        )}
                      </div>
                    </div>

                    {match ? (
                      <button
                        onClick={() => handleDeleteAsset(match.id)}
                        className="p-1.5 text-charcoal-400 hover:text-rose-600 rounded-md hover:bg-rose-50 transition-colors cursor-pointer"
                        title={`Remove ${plat.label} asset`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setNewAsset({ assetType: "social", platform: plat.key, identifier: "", url: "" });
                          setShowAddModal(true);
                        }}
                        className="text-xs font-semibold text-charcoal-700 hover:text-charcoal-900 px-2.5 py-1 rounded-md border border-surface-border hover:bg-surface-warm transition-colors cursor-pointer"
                      >
                        + Add
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-surface-border shadow-card overflow-hidden">
            <div className="px-6 py-4 border-b border-surface-border flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-charcoal-900">Official Assets Catalog</h3>
                <p className="text-xs text-charcoal-500">
                  {assets.length} official assets registered for exclusion from threat scans
                </p>
              </div>
              <button
                onClick={() => setShowAddModal(true)}
                className="text-xs font-semibold text-charcoal-900 hover:text-butter-700 underline inline-flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Add Asset
              </button>
            </div>

            {assets.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-xs text-charcoal-500">No official assets registered yet.</p>
              </div>
            ) : (
              <div className="divide-y divide-surface-border">
                {assets.map((asset) => (
                  <div key={asset.id} className="p-4 flex items-center justify-between hover:bg-surface-subtle/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-surface-warm border border-surface-border flex items-center justify-center text-charcoal-700 flex-shrink-0">
                        {asset.asset_type === "domain" ? (
                          <Globe className="w-4 h-4" />
                        ) : asset.asset_type === "social" ? (
                          <Share2 className="w-4 h-4" />
                        ) : asset.asset_type === "app" ? (
                          <Smartphone className="w-4 h-4" />
                        ) : (
                          <ShieldCheck className="w-4 h-4" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-charcoal-900 font-mono">
                            {asset.identifier}
                          </span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-warm text-charcoal-600 uppercase">
                            {asset.platform}
                          </span>
                          {asset.is_verified ? (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold">
                              VERIFIED
                            </span>
                          ) : (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-stone-100 text-stone-600">
                              CLAIMED
                            </span>
                          )}
                        </div>
                        {asset.url && (
                          <a
                            href={asset.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[11px] text-charcoal-500 hover:underline flex items-center gap-1 mt-0.5"
                          >
                            {asset.url} <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteAsset(asset.id)}
                      className="p-1.5 text-charcoal-400 hover:text-rose-600 rounded-md hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Remove asset"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Asset Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-charcoal-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full border border-surface-border shadow-elevation p-6">
            <h3 className="text-base font-bold text-charcoal-900 mb-1">Register Official Asset</h3>
            <p className="text-xs text-charcoal-600 mb-4 leading-normal">
              Official assets are verified and automatically excluded from look-alike impersonation alerts.
            </p>

            <form onSubmit={handleAddAsset} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-charcoal-800 mb-1">Asset Type</label>
                <select
                  value={newAsset.assetType}
                  onChange={(e) => {
                    const val = e.target.value as any;
                    const defaultPlatform =
                      val === "domain" ? "web" : val === "social" ? "twitter" : val === "app" ? "play_store" : "text";
                    setNewAsset({ ...newAsset, assetType: val, platform: defaultPlatform });
                  }}
                  className="w-full px-3 py-2 text-xs border border-surface-border rounded-lg bg-white"
                >
                  <option value="domain">Official Root Domain / Subdomain</option>
                  <option value="social">Official Social Media Profile</option>
                  <option value="app">Official Mobile Application</option>
                  <option value="alias">Legitimate Brand Alias / Variation</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-charcoal-800 mb-1">Platform</label>
                {newAsset.assetType === "social" ? (
                  <select
                    value={newAsset.platform}
                    onChange={(e) => setNewAsset({ ...newAsset, platform: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-surface-border rounded-lg bg-white"
                  >
                    <option value="twitter">X / Twitter</option>
                    <option value="instagram">Instagram</option>
                    <option value="facebook">Facebook</option>
                    <option value="linkedin">LinkedIn</option>
                    <option value="youtube">YouTube</option>
                    <option value="telegram">Telegram</option>
                  </select>
                ) : (
                  <input
                    type="text"
                    required
                    value={newAsset.platform}
                    onChange={(e) => setNewAsset({ ...newAsset, platform: e.target.value })}
                    placeholder={
                      newAsset.assetType === "app"
                        ? "e.g. play_store, app_store"
                        : newAsset.assetType === "domain"
                        ? "e.g. web"
                        : "e.g. text"
                    }
                    className="w-full px-3 py-2 text-xs border border-surface-border rounded-lg bg-white"
                  />
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-charcoal-800 mb-1">
                  Identifier (Handle, Package ID, or Name)
                </label>
                <input
                  type="text"
                  required
                  value={newAsset.identifier}
                  onChange={(e) => setNewAsset({ ...newAsset, identifier: e.target.value })}
                  placeholder={
                    newAsset.assetType === "social"
                      ? "e.g. @brand or https://instagram.com/brand"
                      : "e.g. @NovaPayOfficial or com.novapay.wallet"
                  }
                  className="w-full px-3 py-2 text-xs border border-surface-border rounded-lg bg-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-charcoal-800 mb-1">Public URL (Optional)</label>
                <input
                  type="url"
                  value={newAsset.url}
                  onChange={(e) => setNewAsset({ ...newAsset, url: e.target.value })}
                  placeholder="https://..."
                  className="w-full px-3 py-2 text-xs border border-surface-border rounded-lg bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-surface-border">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-2 text-xs font-medium text-charcoal-700 hover:bg-surface-warm rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 text-xs font-semibold bg-butter-400 hover:bg-butter-500 text-charcoal-900 rounded-lg shadow-sm"
                >
                  {actionLoading ? "Registering..." : "Add to Catalog"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
