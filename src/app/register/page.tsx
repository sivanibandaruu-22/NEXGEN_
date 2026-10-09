"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShieldCheck, ArrowRight, Loader2, AlertCircle, Building2, Globe } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    organizationName: "",
    brandName: "",
    industry: "Financial Technology",
    primaryDomain: "",
    logoUrl: "",
    description: "",
    twitter: "",
    instagram: "",
    facebook: "",
    linkedin: "",
    youtube: "",
  });
  const [logoImageLoaded, setLogoImageLoaded] = useState(false);
  const [logoImageError, setLogoImageError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isHttpsUrl = (url: string) => {
    if (!url || !url.startsWith("https://")) return false;
    try {
      const u = new URL(url);
      return u.protocol === "https:" && Boolean(u.hostname);
    } catch {
      return false;
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    if (e.target.name === "logoUrl") {
      setLogoImageLoaded(false);
      setLogoImageError(false);
    }
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.logoUrl || !isHttpsUrl(formData.logoUrl)) {
      setError("Brand logo URL is required and must be a secure HTTPS address (e.g. https://brand.com/logo.png)");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Registration failed.");
        setLoading(false);
        return;
      }

      router.push(data.redirect || "/owner/brand-profile");
      router.refresh();
    } catch {
      setError("Network or server connection error. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-warm py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-xl mx-auto">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-lg bg-butter-400 border border-butter-500/30 flex items-center justify-center font-bold text-charcoal-900 shadow-sm">
              <ShieldCheck className="w-6 h-6 text-charcoal-900" />
            </div>
            <span className="font-bold text-xl tracking-tight text-charcoal-900">
              KAMPUS<span className="text-butter-600">.VC</span>
            </span>
          </Link>
          <h1 className="text-2xl font-bold text-charcoal-900 tracking-tight">
            Register Organization & Brand
          </h1>
          <p className="mt-1 text-xs text-charcoal-600">
            Submit your official brand assets for digital impersonation defense and monitoring
          </p>
        </div>

        <div className="bg-white py-8 px-6 sm:px-8 shadow-card rounded-xl border border-surface-border">
          {error && (
            <div className="mb-6 p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-charcoal-800 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  name="fullName"
                  required
                  value={formData.fullName}
                  onChange={handleChange}
                  placeholder="e.g. Jordan Smith"
                  className="block w-full px-3 py-2 text-sm border border-surface-border rounded-lg bg-white placeholder-charcoal-400 focus:border-butter-500 focus:ring-1 focus:ring-butter-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-charcoal-800 mb-1">
                  Work Email Address
                </label>
                <input
                  type="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="security@brand.com"
                  className="block w-full px-3 py-2 text-sm border border-surface-border rounded-lg bg-white placeholder-charcoal-400 focus:border-butter-500 focus:ring-1 focus:ring-butter-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-charcoal-800 mb-1">
                Password (min 8 chars, 1 uppercase, 1 number)
              </label>
              <input
                type="password"
                name="password"
                required
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••••••"
                className="block w-full px-3 py-2 text-sm border border-surface-border rounded-lg bg-white placeholder-charcoal-400 focus:border-butter-500 focus:ring-1 focus:ring-butter-500"
              />
            </div>

            <div className="pt-2 border-t border-surface-border">
              <span className="text-[11px] font-mono font-semibold uppercase text-charcoal-500">
                Organization & Brand Identity
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-charcoal-800 mb-1">
                  Organization / Entity Legal Name
                </label>
                <input
                  type="text"
                  name="organizationName"
                  required
                  value={formData.organizationName}
                  onChange={handleChange}
                  placeholder="Acme Financial Corp"
                  className="block w-full px-3 py-2 text-sm border border-surface-border rounded-lg bg-white placeholder-charcoal-400 focus:border-butter-500 focus:ring-1 focus:ring-butter-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-charcoal-800 mb-1">
                  Brand Name
                </label>
                <input
                  type="text"
                  name="brandName"
                  required
                  value={formData.brandName}
                  onChange={handleChange}
                  placeholder="AcmePay"
                  className="block w-full px-3 py-2 text-sm border border-surface-border rounded-lg bg-white placeholder-charcoal-400 focus:border-butter-500 focus:ring-1 focus:ring-butter-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-charcoal-800 mb-1">
                  Industry Vertical
                </label>
                <select
                  name="industry"
                  value={formData.industry}
                  onChange={handleChange}
                  className="block w-full px-3 py-2 text-sm border border-surface-border rounded-lg bg-white text-charcoal-800 focus:border-butter-500 focus:ring-1 focus:ring-butter-500"
                >
                  <option value="Financial Technology">Financial Technology & Banking</option>
                  <option value="E-Commerce & Retail">E-Commerce & Retail</option>
                  <option value="Healthcare & Life Sciences">Healthcare & Life Sciences</option>
                  <option value="SaaS & Cloud Services">SaaS & Cloud Services</option>
                  <option value="Gaming & Entertainment">Gaming & Entertainment</option>
                  <option value="Telecommunications">Telecommunications</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-charcoal-800 mb-1">
                  Primary Root Domain
                </label>
                <input
                  type="text"
                  name="primaryDomain"
                  required
                  value={formData.primaryDomain}
                  onChange={handleChange}
                  placeholder="acmepay.com"
                  className="block w-full px-3 py-2 text-sm border border-surface-border rounded-lg bg-white placeholder-charcoal-400 focus:border-butter-500 focus:ring-1 focus:ring-butter-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-charcoal-800 mb-1">
                Brand Logo URL <span className="text-rose-500">*</span>
              </label>
              <input
                type="url"
                name="logoUrl"
                required
                value={formData.logoUrl}
                onChange={handleChange}
                placeholder="https://brand.com/logo.png"
                className="block w-full px-3 py-2 text-sm border border-surface-border rounded-lg bg-white placeholder-charcoal-400 focus:border-butter-500 focus:ring-1 focus:ring-butter-500"
              />
              {formData.logoUrl && !isHttpsUrl(formData.logoUrl) && (
                <p className="mt-1 text-xs text-rose-600 flex items-center gap-1 font-medium">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  Brand logo URL must be a secure HTTPS address (e.g. https://brand.com/logo.png)
                </p>
              )}
              {isHttpsUrl(formData.logoUrl) && (
                <div className="mt-2.5 p-3 rounded-lg border border-surface-border bg-stone-50 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-white border border-surface-border flex items-center justify-center overflow-hidden flex-shrink-0 shadow-sm">
                    {logoImageError ? (
                      <span className="text-[10px] text-charcoal-400 font-mono text-center">No image</span>
                    ) : (
                      <img
                        src={formData.logoUrl}
                        alt="Brand Logo Preview"
                        className="w-full h-full object-contain p-1"
                        onLoad={() => {
                          setLogoImageLoaded(true);
                          setLogoImageError(false);
                        }}
                        onError={() => {
                          setLogoImageLoaded(false);
                          setLogoImageError(true);
                        }}
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex-1 text-xs">
                    <div className="font-semibold text-charcoal-800 flex items-center gap-1.5">
                      {logoImageLoaded ? (
                        <>
                          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
                          <span>Logo Preview Verified</span>
                        </>
                      ) : logoImageError ? (
                        <>
                          <span className="inline-block w-2 h-2 rounded-full bg-amber-500"></span>
                          <span className="text-amber-800">Preview image could not load</span>
                        </>
                      ) : (
                        <>
                          <span className="inline-block w-2 h-2 rounded-full bg-charcoal-300"></span>
                          <span>Loading preview...</span>
                        </>
                      )}
                    </div>
                    <p className="text-[11px] text-charcoal-500 truncate mt-0.5">
                      {logoImageError
                        ? "Ensure URL points to a publicly accessible image file (.png, .svg, .jpg)"
                        : formData.logoUrl}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-charcoal-800 mb-1">
                Brand Description & Legitimate Purpose
              </label>
              <textarea
                name="description"
                rows={2}
                required
                value={formData.description}
                onChange={handleChange}
                placeholder="Provide a concise description of services, customer touchpoints, and legitimate operations."
                className="block w-full px-3 py-2 text-sm border border-surface-border rounded-lg bg-white placeholder-charcoal-400 focus:border-butter-500 focus:ring-1 focus:ring-butter-500"
              />
            </div>

            <div className="pt-2 border-t border-surface-border">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-mono font-semibold uppercase text-charcoal-500">
                  Official Social Media Handles (Optional)
                </span>
                <span className="text-[10px] text-charcoal-400 font-medium">
                  Prevents false-positive threat alerts
                </span>
              </div>
              <p className="text-[11px] text-charcoal-500 mb-3 leading-relaxed">
                Provide profile URLs or handles for official social media accounts. The detection engine will automatically exclude them from impersonation scans.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-charcoal-800 mb-1">
                    X / Twitter Handle or URL
                  </label>
                  <input
                    type="text"
                    name="twitter"
                    value={formData.twitter}
                    onChange={handleChange}
                    placeholder="@brand or https://x.com/brand"
                    className="block w-full px-3 py-2 text-xs border border-surface-border rounded-lg bg-white placeholder-charcoal-400 focus:border-butter-500 focus:ring-1 focus:ring-butter-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-charcoal-800 mb-1">
                    Instagram Handle or URL
                  </label>
                  <input
                    type="text"
                    name="instagram"
                    value={formData.instagram}
                    onChange={handleChange}
                    placeholder="@brand or https://instagram.com/brand"
                    className="block w-full px-3 py-2 text-xs border border-surface-border rounded-lg bg-white placeholder-charcoal-400 focus:border-butter-500 focus:ring-1 focus:ring-butter-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-charcoal-800 mb-1">
                    Facebook Page or URL
                  </label>
                  <input
                    type="text"
                    name="facebook"
                    value={formData.facebook}
                    onChange={handleChange}
                    placeholder="brand or https://facebook.com/brand"
                    className="block w-full px-3 py-2 text-xs border border-surface-border rounded-lg bg-white placeholder-charcoal-400 focus:border-butter-500 focus:ring-1 focus:ring-butter-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-charcoal-800 mb-1">
                    LinkedIn Organization or URL
                  </label>
                  <input
                    type="text"
                    name="linkedin"
                    value={formData.linkedin}
                    onChange={handleChange}
                    placeholder="brand or linkedin.com/company/brand"
                    className="block w-full px-3 py-2 text-xs border border-surface-border rounded-lg bg-white placeholder-charcoal-400 focus:border-butter-500 focus:ring-1 focus:ring-butter-500 font-mono"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-charcoal-800 mb-1">
                    YouTube Channel or URL
                  </label>
                  <input
                    type="text"
                    name="youtube"
                    value={formData.youtube}
                    onChange={handleChange}
                    placeholder="@brand or https://youtube.com/@brand"
                    className="block w-full px-3 py-2 text-xs border border-surface-border rounded-lg bg-white placeholder-charcoal-400 focus:border-butter-500 focus:ring-1 focus:ring-butter-500 font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-charcoal-900 bg-butter-400 hover:bg-butter-500 disabled:opacity-50 transition-all cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Submitting Registration...
                  </>
                ) : (
                  <>
                    Submit Brand for Verification
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="mt-6 text-center text-xs text-charcoal-600">
            Already registered?{" "}
            <Link href="/login" className="font-semibold text-charcoal-900 underline hover:text-butter-700">
              Sign in to Risk Portal
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
