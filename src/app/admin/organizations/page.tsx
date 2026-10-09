"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import {
  Building2,
  CheckCircle2,
  XCircle,
  Clock,
  HelpCircle,
  ExternalLink,
  ShieldCheck,
  Search,
  Filter,
  Loader2,
  AlertCircle,
  FolderGit2,
} from "lucide-react";

export default function AdminOrganizationsPage() {
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedOrg, setSelectedOrg] = useState<any | null>(null);
  const [decisionModal, setDecisionModal] = useState<any | null>(null);
  const [decisionType, setDecisionType] = useState<"approve" | "reject" | "needs_info">("approve");
  const [reason, setReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const fetchOrganizations = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/organizations");
      if (res.ok) {
        const json = await res.json();
        setOrganizations(json.organizations || []);
      }
    } catch (err) {
      console.error("Error fetching organizations", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const handleDecisionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!decisionModal) return;
    setActionLoading(true);
    setMessage(null);

    try {
      const res = await fetch("/api/admin/organizations/decision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId: decisionModal.id,
          decision: decisionType,
          reason,
        }),
      });

      const resData = await res.json();
      if (res.ok) {
        setMessage({ text: resData.message || "Decision recorded.", type: "success" });
        const newStatus = resData.newStatus || (decisionType === "approve" ? "verified" : decisionType === "reject" ? "rejected" : "needs_info");
        setOrganizations((prev) =>
          prev.map((o) => (o.id === decisionModal.id ? { ...o, verificationStatus: newStatus } : o))
        );
        setDecisionModal(null);
        setReason("");
        fetchOrganizations();
      } else {
        setMessage({ text: resData.error || "Failed to record decision.", type: "error" });
      }
    } catch {
      setMessage({ text: "Error recording decision.", type: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  const filteredOrgs = organizations.filter((org) => {
    if (statusFilter === "all") return true;
    return org.verificationStatus === statusFilter;
  });

  return (
    <div>
      <PageHeader
        title="Organizations & Verification"
        description="Review organization registration submissions, validate cryptographic DNS tokens, and persist approval or rejection determinations."
        fallbackBackUrl="/admin"
        breadcrumbs={[{ label: "Admin Workspace", href: "/admin" }, { label: "Organizations" }]}
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
          {["all", "pending_verification", "submitted", "verified", "rejected"].map((s) => (
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
          Showing {filteredOrgs.length} of {organizations.length} organizations
        </span>
      </div>

      {loading ? (
        <div className="py-20 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-charcoal-400 mb-3" />
          <p className="text-xs text-charcoal-500 font-mono">Loading Organizations...</p>
        </div>
      ) : filteredOrgs.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-xl border border-surface-border">
          <Building2 className="w-8 h-8 text-charcoal-400 mx-auto mb-2" />
          <p className="text-sm font-semibold text-charcoal-700">No organizations found</p>
          <p className="text-xs text-charcoal-500 mt-1">Try selecting another filter status above.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrgs.map((org) => (
            <div
              key={org.id}
              className="bg-white rounded-xl border border-surface-border shadow-card p-6 hover:border-butter-400 transition-all"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-4 border-b border-surface-border">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-surface-warm border border-surface-border flex items-center justify-center font-bold text-charcoal-900 text-lg flex-shrink-0">
                    {org.brandProfile?.brandName?.charAt(0) || org.name.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h3 className="text-base font-bold text-charcoal-900">{org.name}</h3>
                      <span className="text-xs text-charcoal-400 font-mono">({org.slug})</span>
                      {org.verificationStatus === "verified" ? (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> VERIFIED
                        </span>
                      ) : org.verificationStatus === "pending_verification" ? (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-semibold flex items-center gap-1">
                          <Clock className="w-3 h-3" /> PENDING REVIEW
                        </span>
                      ) : org.verificationStatus === "rejected" ? (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-semibold flex items-center gap-1">
                          <XCircle className="w-3 h-3" /> REJECTED
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-stone-100 text-stone-700 font-semibold">
                          SUBMITTED
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-charcoal-500 mt-1">
                      Owner: {org.owner?.full_name || "N/A"} ({org.owner?.email || "N/A"}) • Registered:{" "}
                      {new Date(org.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {/* Admin Review Action Buttons */}
                <div className="flex items-center gap-2">
                  {org.verificationStatus === "verified" ? (
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/admin/investigations?orgId=${org.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-charcoal-900 hover:bg-charcoal-800 text-white shadow-sm transition-colors cursor-pointer"
                      >
                        <FolderGit2 className="w-3.5 h-3.5 text-butter-400" />
                        <span>Start Monitoring Investigation</span>
                      </Link>
                      <Link
                        href="/admin/reports"
                        className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-surface-warm hover:bg-surface-muted text-charcoal-700 border border-surface-border transition-colors cursor-pointer"
                      >
                        Reports
                      </Link>
                    </div>
                  ) : org.verificationStatus === "rejected" ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-rose-700 font-mono font-medium">Review Complete</span>
                      <button
                        onClick={() => {
                          setDecisionModal(org);
                          setDecisionType("approve");
                          setReason("Re-evaluating domain ownership and updated LEI/DNS documents.");
                        }}
                        className="px-2.5 py-1 rounded text-xs font-medium bg-surface-warm hover:bg-surface-muted text-charcoal-700 border border-surface-border transition-colors cursor-pointer"
                      >
                        Re-evaluate
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          setDecisionModal(org);
                          setDecisionType("approve");
                          setReason("Domain DNS challenge token verified & legitimate legal identity confirmed.");
                        }}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-colors cursor-pointer"
                      >
                        Approve Brand
                      </button>
                      <button
                        onClick={() => {
                          setDecisionModal(org);
                          setDecisionType("reject");
                          setReason("DNS token not detected on root nameserver or ownership unverifiable.");
                        }}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-colors cursor-pointer"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => {
                          setDecisionModal(org);
                          setDecisionType("needs_info");
                          setReason("Please provide official LEI identifier or store developer account validation.");
                        }}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-surface-warm hover:bg-surface-muted text-charcoal-700 border border-surface-border transition-colors cursor-pointer"
                      >
                        Request Info
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Organization & Brand Asset Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 text-xs">
                <div>
                  <span className="font-semibold text-charcoal-700 block mb-1">Brand Profile</span>
                  <div className="space-y-1 text-charcoal-600">
                    <p>
                      <strong>Brand:</strong> {org.brandProfile?.brandName || "None"}
                    </p>
                    <p>
                      <strong>Industry:</strong> {org.brandProfile?.industry || "None"}
                    </p>
                    <p>
                      <strong>Domain:</strong>{" "}
                      <a
                        href={`https://${org.brandProfile?.primaryDomain}`}
                        target="_blank"
                        rel="noreferrer"
                        className="underline font-mono text-charcoal-900"
                      >
                        {org.brandProfile?.primaryDomain}
                      </a>
                    </p>
                  </div>
                </div>

                <div>
                  <span className="font-semibold text-charcoal-700 block mb-1">
                    Cryptographic DNS Verification
                  </span>
                  <div className="p-2 rounded bg-surface-warm font-mono text-[11px] text-charcoal-800 border border-surface-border break-all">
                    {org.brandProfile?.dnsTxtRecord || "No record generated"}
                  </div>
                  <span className="text-[10px] text-charcoal-500 mt-1 block">
                    Domain challenge state:{" "}
                    {org.brandProfile?.domainVerified ? "Confirmed verified" : "Pending lookup"}
                  </span>
                </div>

                <div>
                  <span className="font-semibold text-charcoal-700 block mb-1">
                    Official Assets ({org.assets?.length || 0})
                  </span>
                  <div className="max-h-24 overflow-y-auto space-y-1 font-mono text-[11px] text-charcoal-600">
                    {org.assets?.length > 0 ? (
                      org.assets.map((a: any) => (
                        <div key={a.id} className="flex items-center justify-between">
                          <span>
                            [{a.platform}] {a.identifier}
                          </span>
                          <span
                            className={
                              a.is_verified ? "text-emerald-700 font-bold" : "text-charcoal-400"
                            }
                          >
                            {a.is_verified ? "✓" : "○"}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-charcoal-400 italic">No additional assets</p>
                    )}
                  </div>
                </div>
              </div>

              {org.verificationReason && (
                <div className="mt-4 pt-3 border-t border-surface-border/60 text-xs text-charcoal-600">
                  <span className="font-semibold text-charcoal-800">Recorded Admin Note: </span>
                  {org.verificationReason}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Decision Modal */}
      {decisionModal && (
        <div className="fixed inset-0 z-50 bg-charcoal-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full border border-surface-border shadow-elevation p-6">
            <h3 className="text-base font-bold text-charcoal-900 mb-1">
              Record Verification Determination: {decisionModal.name}
            </h3>
            <p className="text-xs text-charcoal-600 mb-4 leading-normal">
              Admin actions are permanently recorded with your actor ID, timestamp, and justification.
            </p>

            <form onSubmit={handleDecisionSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-charcoal-800 mb-1">Determination</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setDecisionType("approve")}
                    className={`py-2 text-xs font-semibold rounded-lg border text-center cursor-pointer ${
                      decisionType === "approve"
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : "bg-surface-warm text-charcoal-700 border-surface-border"
                    }`}
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => setDecisionType("reject")}
                    className={`py-2 text-xs font-semibold rounded-lg border text-center cursor-pointer ${
                      decisionType === "reject"
                        ? "bg-rose-600 text-white border-rose-600"
                        : "bg-surface-warm text-charcoal-700 border-surface-border"
                    }`}
                  >
                    Reject
                  </button>
                  <button
                    type="button"
                    onClick={() => setDecisionType("needs_info")}
                    className={`py-2 text-xs font-semibold rounded-lg border text-center cursor-pointer ${
                      decisionType === "needs_info"
                        ? "bg-amber-600 text-white border-amber-600"
                        : "bg-surface-warm text-charcoal-700 border-surface-border"
                    }`}
                  >
                    Request Info
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-charcoal-800 mb-1">
                  Recorded Reason & Audit Justification (Mandatory)
                </label>
                <textarea
                  required
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Explain the rationale for this verification determination..."
                  className="w-full px-3 py-2 text-xs border border-surface-border rounded-lg bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-surface-border">
                <button
                  type="button"
                  onClick={() => setDecisionModal(null)}
                  className="px-3 py-2 text-xs font-medium text-charcoal-700 hover:bg-surface-warm rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading || reason.length < 5}
                  className="px-4 py-2 text-xs font-semibold bg-charcoal-900 text-white hover:bg-charcoal-800 disabled:opacity-50 rounded-lg shadow-sm"
                >
                  {actionLoading ? "Recording..." : "Persist Decision"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
