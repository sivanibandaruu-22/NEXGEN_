"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShieldCheck, Lock, Mail, ArrowRight, Loader2, Sparkles, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e?: React.FormEvent, customEmail?: string, customPassword?: string) => {
    if (e) e.preventDefault();
    setError(null);
    setLoading(true);

    const submitEmail = customEmail || email;
    const submitPassword = customPassword || password;

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: submitEmail, password: submitPassword }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Authentication failed.");
        setLoading(false);
        return;
      }

      // Successful login redirect
      router.push(data.redirect || (data.role === "admin" ? "/admin" : "/owner"));
      router.refresh();
    } catch {
      setError("Network or server connection error. Please try again.");
      setLoading(false);
    }
  };

  const handleQuickDemo = (role: "admin" | "owner") => {
    if (role === "admin") {
      setEmail("admin@kampus.vc");
      setPassword("AdminPassword2026!");
      handleSubmit(undefined, "admin@kampus.vc", "AdminPassword2026!");
    } else {
      setEmail("owner@novapay.io");
      setPassword("OwnerPassword2026!");
      handleSubmit(undefined, "owner@novapay.io", "OwnerPassword2026!");
    }
  };

  return (
    <div className="min-h-screen bg-surface-warm flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link href="/" className="inline-flex items-center gap-2 mb-4">
          <div className="w-10 h-10 rounded-lg bg-butter-400 border border-butter-500/30 flex items-center justify-center font-bold text-charcoal-900 shadow-sm">
            <ShieldCheck className="w-6 h-6 text-charcoal-900" />
          </div>
          <span className="font-bold text-xl tracking-tight text-charcoal-900">
            KAMPUS<span className="text-butter-600">.VC</span>
          </span>
        </Link>
        <h2 className="text-2xl font-bold text-charcoal-900 tracking-tight">
          Sign in to Risk Portal
        </h2>
        <p className="mt-2 text-xs text-charcoal-600 font-normal">
          Authorized personnel and organization owners only
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-card rounded-xl border border-surface-border">
          {error && (
            <div className="mb-6 p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-charcoal-800 mb-1.5">
                Work Email Address
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="block w-full pl-10 pr-3 py-2 text-sm border border-surface-border rounded-lg bg-white placeholder-charcoal-400 focus:border-butter-500 focus:ring-1 focus:ring-butter-500"
                />
                <Mail className="w-4 h-4 text-charcoal-400 absolute left-3 top-2.5" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-charcoal-800 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="block w-full pl-10 pr-3 py-2 text-sm border border-surface-border rounded-lg bg-white placeholder-charcoal-400 focus:border-butter-500 focus:ring-1 focus:ring-butter-500"
                />
                <Lock className="w-4 h-4 text-charcoal-400 absolute left-3 top-2.5" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-charcoal-900 bg-butter-400 hover:bg-butter-500 disabled:opacity-50 transition-all cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Authenticating...
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Section */}
          <div className="mt-8 pt-6 border-t border-surface-border">
            <div className="flex items-center gap-1.5 mb-3">
              <Sparkles className="w-4 h-4 text-butter-600" />
              <span className="text-xs font-semibold uppercase tracking-wider text-charcoal-700">
                Hackathon Quick Demo Entry
              </span>
            </div>
            <p className="text-[11px] text-charcoal-500 mb-4 leading-normal">
              Click below to immediately log in through the validated authentication flow using pre-seeded test environments:
            </p>

            <div className="grid grid-cols-1 gap-2.5">
              <button
                type="button"
                onClick={() => handleQuickDemo("admin")}
                disabled={loading}
                className="w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-semibold text-charcoal-900 bg-surface-warm hover:bg-butter-100 border border-surface-border rounded-lg transition-colors text-left"
              >
                <div>
                  <span className="block font-bold">Quick Demo — Admin</span>
                  <span className="text-[10px] text-charcoal-500 font-mono">admin@kampus.vc (Platform Operator)</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-charcoal-600" />
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemo("owner")}
                disabled={loading}
                className="w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-semibold text-charcoal-900 bg-surface-warm hover:bg-butter-100 border border-surface-border rounded-lg transition-colors text-left"
              >
                <div>
                  <span className="block font-bold">Quick Demo — Organization Owner</span>
                  <span className="text-[10px] text-charcoal-500 font-mono">owner@novapay.io (NovaPay Global)</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-charcoal-600" />
              </button>
            </div>
          </div>

          <div className="mt-6 text-center">
            <p className="text-xs text-charcoal-600">
              Need to protect a new brand?{" "}
              <Link href="/register" className="font-semibold text-charcoal-900 underline hover:text-butter-700">
                Register Organization
              </Link>
            </p>
          </div>
        </div>

        <div className="mt-4 text-center">
          <Link href="/" className="text-xs text-charcoal-500 hover:text-charcoal-800 transition-colors">
            ← Return to public home
          </Link>
        </div>
      </div>
    </div>
  );
}
