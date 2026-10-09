import Link from "next/link";
import { ShieldCheck, MailCheck, ArrowRight } from "lucide-react";

export default function VerifyEmailPage() {
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
      </div>

      <div className="mt-4 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-card rounded-xl border border-surface-border text-center">
          <div className="w-12 h-12 rounded-full bg-butter-100 border border-butter-300 flex items-center justify-center mx-auto mb-4 text-butter-700">
            <MailCheck className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-charcoal-900 mb-2">
            Email Verification Status
          </h2>
          <p className="text-xs text-charcoal-600 leading-relaxed mb-6">
            In hackathon demonstration mode, pre-configured accounts and registered organizations have email verification satisfied automatically to facilitate live evaluation. In production, SMTP validation tokens are dispatched before activation.
          </p>

          <Link
            href="/login"
            className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-semibold text-charcoal-900 bg-butter-400 hover:bg-butter-500 transition-colors shadow-sm"
          >
            Continue to Sign In
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
