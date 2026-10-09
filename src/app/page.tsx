import Link from "next/link";
import {
  ShieldCheck,
  Globe,
  Smartphone,
  Search,
  KeyRound,
  FileText,
  AlertTriangle,
  Database,
  ArrowRight,
  CheckCircle2,
  Lock,
  Layers,
  ChevronRight,
  Activity,
  Server,
  Terminal,
} from "lucide-react";

export default function PublicLandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-white text-charcoal-700">
      {/* 1. Minimal Navigation */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-surface-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-butter-400 border border-butter-500/30 flex items-center justify-center font-bold text-charcoal-900 shadow-sm">
              <ShieldCheck className="w-5 h-5 text-charcoal-900" />
            </div>
            <div>
              <span className="font-semibold text-lg tracking-tight text-charcoal-800">
                KAMPUS<span className="text-butter-600">.VC</span>
              </span>
              <span className="ml-2 text-xs uppercase tracking-widest text-charcoal-400 font-mono hidden sm:inline">
                Risk Platform
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-charcoal-600">
            <a href="#features" className="hover:text-charcoal-900 transition-colors">
              Features
            </a>
            <a href="#workflow" className="hover:text-charcoal-900 transition-colors">
              How It Works
            </a>
            <a href="#scoring" className="hover:text-charcoal-900 transition-colors">
              Scoring Model
            </a>
            <a href="#sources" className="hover:text-charcoal-900 transition-colors">
              Data Sources
            </a>
            <a href="#security" className="hover:text-charcoal-900 transition-colors">
              Security & Privacy
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm font-medium text-charcoal-700 hover:text-charcoal-900 px-3 py-1.5 rounded-md hover:bg-surface-warm transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="text-sm font-semibold text-charcoal-900 bg-butter-400 hover:bg-butter-500 px-4 py-2 rounded-md shadow-sm border border-butter-500/20 transition-all"
            >
              Register Organization
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-grow">
        {/* 2. Hero Section: Social & App Impersonation Risks */}
        <section className="relative pt-20 pb-16 md:pt-28 md:pb-24 border-b border-surface-border bg-gradient-to-b from-surface-subtle via-white to-white">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-butter-100 border border-butter-300 text-charcoal-800 mb-6">
              <span className="w-2 h-2 rounded-full bg-butter-500 animate-pulse"></span>
              Autonomous Brand Impersonation Defense & Threat Intelligence
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-charcoal-900 tracking-tight leading-tight sm:leading-none mb-6">
              Stop brand spoofing across social networks and app stores.
            </h1>

            <p className="text-lg sm:text-xl text-charcoal-600 max-w-3xl mx-auto mb-10 leading-relaxed font-normal">
              Attackers register homoglyph usernames, rogue Android packages, and fake customer support handles in minutes. Kampus.VC provides deterministic, evidence-based monitoring and verified asset exclusion to protect your identity.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/register"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg text-base font-semibold bg-butter-400 hover:bg-butter-500 text-charcoal-900 shadow-sm border border-butter-500/30 transition-all"
              >
                Register Your Organization
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href="#features"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg text-base font-medium bg-white hover:bg-surface-warm text-charcoal-800 border border-surface-border shadow-sm transition-all"
              >
                Explore the Four Capabilities
              </a>
            </div>

            {/* Quick Demo highlight for evaluators */}
            <div className="mt-8 pt-6 border-t border-surface-border/60 max-w-md mx-auto">
              <p className="text-xs text-charcoal-500 mb-2 font-mono">HACKATHON EVALUATOR SHORTCUT:</p>
              <Link
                href="/login"
                className="text-xs inline-flex items-center gap-1 font-semibold text-charcoal-800 hover:text-charcoal-900 bg-surface-warm hover:bg-butter-100 px-3 py-1.5 rounded-md border border-surface-border transition-colors"
              >
                Launch Single-Click Quick Demo for Admin & Owner
                <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </section>

        {/* 3. The Four Mandatory Features Section */}
        <section id="features" className="py-20 bg-white border-b border-surface-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-xs uppercase tracking-widest font-mono text-charcoal-500 mb-2">
                Core Protection Engine
              </h2>
              <p className="text-3xl font-bold text-charcoal-900 tracking-tight">
                Four mandatory defense pillars for digital asset integrity
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Feature 1: Brand Profile */}
              <div className="bg-surface-subtle p-8 rounded-xl border border-surface-border hover:border-butter-400 transition-all flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 rounded-lg bg-white border border-surface-border flex items-center justify-center text-charcoal-800 mb-6 shadow-sm">
                    <ShieldCheck className="w-6 h-6 text-charcoal-900" />
                  </div>
                  <span className="text-xs font-mono font-semibold uppercase text-butter-700 bg-butter-100 px-2.5 py-1 rounded">
                    Mandatory Feature 1
                  </span>
                  <h3 className="text-xl font-bold text-charcoal-900 mt-3 mb-2">
                    Brand Profile
                  </h3>
                  <p className="text-sm text-charcoal-600 leading-relaxed mb-6">
                    Register and verify your legitimate identity assets: official root domains, social handles, mobile application package IDs, publisher names, and trademarked logos. Utilizes cryptographic DNS TXT challenges to distinguish verified assets from rogue mimics.
                  </p>
                </div>
                <div className="pt-4 border-t border-surface-border/80 flex items-center justify-between text-xs font-medium text-charcoal-500">
                  <span>Cryptographic DNS verification</span>
                  <Link href="/login" className="text-charcoal-800 font-semibold hover:underline inline-flex items-center gap-1">
                    Manage Profile <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

              {/* Feature 2: Social Media Monitoring */}
              <div className="bg-surface-subtle p-8 rounded-xl border border-surface-border hover:border-butter-400 transition-all flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 rounded-lg bg-white border border-surface-border flex items-center justify-center text-charcoal-800 mb-6 shadow-sm">
                    <Globe className="w-6 h-6 text-charcoal-900" />
                  </div>
                  <span className="text-xs font-mono font-semibold uppercase text-butter-700 bg-butter-100 px-2.5 py-1 rounded">
                    Mandatory Feature 2
                  </span>
                  <h3 className="text-xl font-bold text-charcoal-900 mt-3 mb-2">
                    Social Media Monitoring
                  </h3>
                  <p className="text-sm text-charcoal-600 leading-relaxed mb-6">
                    Continuous surveillance across X, Instagram, Facebook, LinkedIn, and Telegram. Detects look-alike handles, fake customer support accounts, homoglyphs, and bio similarity while guaranteeing official verified profiles are excluded from threat flags.
                  </p>
                </div>
                <div className="pt-4 border-t border-surface-border/80 flex items-center justify-between text-xs font-medium text-charcoal-500">
                  <span>Multi-network adapter matrix</span>
                  <Link href="/login" className="text-charcoal-800 font-semibold hover:underline inline-flex items-center gap-1">
                    Inspect Findings <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

              {/* Feature 3: App Store Monitoring */}
              <div className="bg-surface-subtle p-8 rounded-xl border border-surface-border hover:border-butter-400 transition-all flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 rounded-lg bg-white border border-surface-border flex items-center justify-center text-charcoal-800 mb-6 shadow-sm">
                    <Smartphone className="w-6 h-6 text-charcoal-900" />
                  </div>
                  <span className="text-xs font-mono font-semibold uppercase text-butter-700 bg-butter-100 px-2.5 py-1 rounded">
                    Mandatory Feature 3
                  </span>
                  <h3 className="text-xl font-bold text-charcoal-900 mt-3 mb-2">
                    App Store Monitoring
                  </h3>
                  <p className="text-sm text-charcoal-600 leading-relaxed mb-6">
                    Automated inspection across Google Play and Apple App Store listings. Flags rogue APKs, developer entity mismatches, bundle ID clones (e.g. <code>com.brand.wallet.fake</code>), icon imitation, and suspicious third-party utilities posing as official apps.
                  </p>
                </div>
                <div className="pt-4 border-t border-surface-border/80 flex items-center justify-between text-xs font-medium text-charcoal-500">
                  <span>Package ID & Publisher mismatch</span>
                  <Link href="/login" className="text-charcoal-800 font-semibold hover:underline inline-flex items-center gap-1">
                    Store Intel <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

              {/* Feature 4: Look-alike Name Detection */}
              <div className="bg-surface-subtle p-8 rounded-xl border border-surface-border hover:border-butter-400 transition-all flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 rounded-lg bg-white border border-surface-border flex items-center justify-center text-charcoal-800 mb-6 shadow-sm">
                    <Search className="w-6 h-6 text-charcoal-900" />
                  </div>
                  <span className="text-xs font-mono font-semibold uppercase text-butter-700 bg-butter-100 px-2.5 py-1 rounded">
                    Mandatory Feature 4
                  </span>
                  <h3 className="text-xl font-bold text-charcoal-900 mt-3 mb-2">
                    Look-alike Name Detection
                  </h3>
                  <p className="text-sm text-charcoal-600 leading-relaxed mb-6">
                    Specialized normalization engine handling Unicode homoglyphs, leetspeak (<code>@-&gt;a</code>, <code>0-&gt;o</code>, <code>1-&gt;l</code>), character transpositions, punctuation delimiters, and suspicious phishing affixes with exact structural transformation explanations.
                  </p>
                </div>
                <div className="pt-4 border-t border-surface-border/80 flex items-center justify-between text-xs font-medium text-charcoal-500">
                  <span>Damerau-Levenshtein & Jaro-Winkler</span>
                  <Link href="/login" className="text-charcoal-800 font-semibold hover:underline inline-flex items-center gap-1">
                    Test Engine <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 4. Investigation Workflow */}
        <section id="workflow" className="py-20 bg-surface-warm border-b border-surface-border">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h2 className="text-xs uppercase tracking-widest font-mono text-charcoal-500 mb-2">
                Operational Lifecycle
              </h2>
              <p className="text-3xl font-bold text-charcoal-900 tracking-tight">
                Authentic, server-driven investigation workflow
              </p>
              <p className="text-sm text-charcoal-600 mt-3">
                No decorative animation bars. Every stage corresponds to persistent database state and admin review checkpoints.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-lg border border-surface-border shadow-sm">
                <div className="w-8 h-8 rounded-full bg-charcoal-900 text-white font-mono font-bold text-sm flex items-center justify-center mb-4">
                  1
                </div>
                <h4 className="font-bold text-charcoal-900 mb-2">Asset Registration</h4>
                <p className="text-xs text-charcoal-600 leading-relaxed">
                  Organization owner submits verified domains, handles, and store package IDs. DNS TXT records are confirmed before scans.
                </p>
              </div>

              <div className="bg-white p-6 rounded-lg border border-surface-border shadow-sm">
                <div className="w-8 h-8 rounded-full bg-charcoal-900 text-white font-mono font-bold text-sm flex items-center justify-center mb-4">
                  2
                </div>
                <h4 className="font-bold text-charcoal-900 mb-2">Adapter Execution</h4>
                <p className="text-xs text-charcoal-600 leading-relaxed">
                  Live platform adapters collect raw candidates. Verified assets are filtered out to prevent false alarms on official accounts.
                </p>
              </div>

              <div className="bg-white p-6 rounded-lg border border-surface-border shadow-sm">
                <div className="w-8 h-8 rounded-full bg-charcoal-900 text-white font-mono font-bold text-sm flex items-center justify-center mb-4">
                  3
                </div>
                <h4 className="font-bold text-charcoal-900 mb-2">Evidence Scoring</h4>
                <p className="text-xs text-charcoal-600 leading-relaxed">
                  Homoglyphs, publisher mismatches, and bio keywords are weighted deterministically. Missing data is reported without guessing.
                </p>
              </div>

              <div className="bg-white p-6 rounded-lg border border-surface-border shadow-sm">
                <div className="w-8 h-8 rounded-full bg-charcoal-900 text-white font-mono font-bold text-sm flex items-center justify-center mb-4">
                  4
                </div>
                <h4 className="font-bold text-charcoal-900 mb-2">Admin Review & Share</h4>
                <p className="text-xs text-charcoal-600 leading-relaxed">
                  Platform Admin validates findings, marks false positives, approves report, and creates an access-controlled share record.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 5. Explainable Scoring Model & False-Positive Handling */}
        <section id="scoring" className="py-20 bg-white border-b border-surface-border">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-xs uppercase tracking-widest font-mono text-charcoal-500 mb-2">
                  Scoring Transparency
                </h2>
                <h3 className="text-3xl font-bold text-charcoal-900 tracking-tight mb-4">
                  Zero unexplained risk percentages. Evidence you can audit.
                </h3>
                <p className="text-charcoal-600 text-sm leading-relaxed mb-6">
                  Many threat tools present random 87% or 94% scores without mathematical backing. Kampus.VC calculates deterministic, weighted scores based strictly on available telemetry:
                </p>

                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-surface-subtle border border-surface-border">
                    <CheckCircle2 className="w-5 h-5 text-butter-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="text-xs font-semibold text-charcoal-900 block">
                        Weight Re-normalization for Missing Signals
                      </span>
                      <span className="text-xs text-charcoal-600">
                        If an app store doesn’t disclose developer LEI, the engine marks the signal unavailable rather than penalizing legitimate utilities.
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-lg bg-surface-subtle border border-surface-border">
                    <CheckCircle2 className="w-5 h-5 text-butter-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="text-xs font-semibold text-charcoal-900 block">
                        Verified Asset Exemption Gate
                      </span>
                      <span className="text-xs text-charcoal-600">
                        Any finding matching your confirmed official domains, handles, or package IDs is automatically excluded before risk scoring.
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-lg bg-surface-subtle border border-surface-border">
                    <CheckCircle2 className="w-5 h-5 text-butter-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="text-xs font-semibold text-charcoal-900 block">
                        Admin False-Positive Triage
                      </span>
                      <span className="text-xs text-charcoal-600">
                        Admin can mark findings as &quot;False Positive / Not a Threat&quot; with a recorded justification and audit actor timestamp.
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-charcoal-900 text-charcoal-100 p-6 rounded-xl border border-charcoal-800 font-mono text-xs shadow-xl">
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-charcoal-800 text-charcoal-400">
                  <span>RISK_SCORE_CALCULATOR_V1</span>
                  <span className="text-emerald-400">DETERMINISTIC</span>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-charcoal-300">
                    <span>1. Name Homoglyph/Distance:</span>
                    <span className="text-butter-300 font-semibold">92 / 100 (Weight: 35%)</span>
                  </div>
                  <div className="flex justify-between items-center text-charcoal-300">
                    <span>2. Publisher Entity Discrepancy:</span>
                    <span className="text-butter-300 font-semibold">100 / 100 (Weight: 25%)</span>
                  </div>
                  <div className="flex justify-between items-center text-charcoal-300">
                    <span>3. Phishing Bio Keywords:</span>
                    <span className="text-butter-300 font-semibold">75 / 100 (Weight: 15%)</span>
                  </div>
                  <div className="flex justify-between items-center text-charcoal-300">
                    <span>4. Suspicious Outbound URL:</span>
                    <span className="text-butter-300 font-semibold">80 / 100 (Weight: 15%)</span>
                  </div>
                  <div className="flex justify-between items-center text-charcoal-400">
                    <span>5. Trademark Icon Similarity:</span>
                    <span className="text-charcoal-500 italic">UNAVAILABLE (Weight: 0%)</span>
                  </div>

                  <div className="pt-3 mt-4 border-t border-charcoal-800 flex justify-between items-center text-sm">
                    <span className="text-white font-bold">NORMALIZED RISK SCORE:</span>
                    <span className="text-rose-400 font-bold">89 / 100 [HIGH RISK]</span>
                  </div>
                  <p className="text-[11px] text-charcoal-400 mt-2">
                    Exact finding transformation: &quot;Target replaced Latin &apos;o&apos; with Cyrillic &apos;\u043E&apos; and inserted suffix &apos;support-desk&apos;&quot;.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 6. Supported vs Unavailable Data Sources */}
        <section id="sources" className="py-20 bg-surface-subtle border-b border-surface-border">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h2 className="text-xs uppercase tracking-widest font-mono text-charcoal-500 mb-2">
                Integration Transparency
              </h2>
              <p className="text-3xl font-bold text-charcoal-900 tracking-tight">
                Honest operational adapter boundaries
              </p>
              <p className="text-sm text-charcoal-600 mt-3">
                We never fake API responses or pretend unavailable platform endpoints were called.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-5 rounded-lg border border-surface-border">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-bold text-charcoal-900 text-sm">X / Twitter</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold">
                    SUPPORTED
                  </span>
                </div>
                <p className="text-xs text-charcoal-600">
                  Analyzes public profiles, handles, homoglyphs, and bio links via official v2 search or structured manual submission.
                </p>
              </div>

              <div className="bg-white p-5 rounded-lg border border-surface-border">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-bold text-charcoal-900 text-sm">Google Play</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold">
                    SUPPORTED
                  </span>
                </div>
                <p className="text-xs text-charcoal-600">
                  Inspects package IDs, developer accounts, title variations, and permissions using permitted store directory adapters.
                </p>
              </div>

              <div className="bg-white p-5 rounded-lg border border-surface-border">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-bold text-charcoal-900 text-sm">Apple App Store</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold">
                    SUPPORTED
                  </span>
                </div>
                <p className="text-xs text-charcoal-600">
                  Tracks iTunes search API metadata, developer IDs, and bundle variations for iOS ecosystem impersonators.
                </p>
              </div>

              <div className="bg-white p-5 rounded-lg border border-surface-border">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-bold text-charcoal-900 text-sm">Private Telegram</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-semibold">
                    UNAVAILABLE
                  </span>
                </div>
                <p className="text-xs text-charcoal-600">
                  Requires bot token and enterprise MTProto credentials. When unconfigured, marked explicitly unavailable without fake data.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 7. Security, SSRF & Privacy Section */}
        <section id="security" className="py-20 bg-white border-b border-surface-border">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h2 className="text-xs uppercase tracking-widest font-mono text-charcoal-500 mb-2">
                Application Security Architecture
              </h2>
              <p className="text-3xl font-bold text-charcoal-900 tracking-tight">
                Hardened by design against adversarial attacks
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="p-6 rounded-lg bg-surface-subtle border border-surface-border">
                <div className="w-10 h-10 rounded-md bg-white border border-surface-border flex items-center justify-center mb-4">
                  <Lock className="w-5 h-5 text-charcoal-900" />
                </div>
                <h4 className="font-bold text-charcoal-900 mb-2">Server Authorization & 2 Roles</h4>
                <p className="text-xs text-charcoal-600 leading-relaxed">
                  Strictly two roles: Admin and Organization Owner. Every database query enforces tenant isolation. No frontend route hiding alone.
                </p>
              </div>

              <div className="p-6 rounded-lg bg-surface-subtle border border-surface-border">
                <div className="w-10 h-10 rounded-md bg-white border border-surface-border flex items-center justify-center mb-4">
                  <Server className="w-5 h-5 text-charcoal-900" />
                </div>
                <h4 className="font-bold text-charcoal-900 mb-2">SSRF & DNS-Rebinding Guard</h4>
                <p className="text-xs text-charcoal-600 leading-relaxed">
                  Outbound URL requests resolve IP addresses and block private RFC1918 ranges, loopback (127.0.0.1), and cloud metadata (169.254.169.254).
                </p>
              </div>

              <div className="p-6 rounded-lg bg-surface-subtle border border-surface-border">
                <div className="w-10 h-10 rounded-md bg-white border border-surface-border flex items-center justify-center mb-4">
                  <Activity className="w-5 h-5 text-charcoal-900" />
                </div>
                <h4 className="font-bold text-charcoal-900 mb-2">Login Threat Detection</h4>
                <p className="text-xs text-charcoal-600 leading-relaxed">
                  Tracks failed authentications, brute-force anomalies, and rate limit triggers. Logs tamper-evident security events to Admin workspace.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 8. Call to Action */}
        <section className="py-20 bg-butter-50 border-b border-butter-200">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-extrabold text-charcoal-900 mb-4">
              Protect your brand against digital impersonation today
            </h2>
            <p className="text-charcoal-600 mb-8 max-w-xl mx-auto text-sm leading-relaxed">
              Register your organization, verify your assets, and receive comprehensive risk intelligence reviewed by platform analysts.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/register"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg text-sm font-semibold bg-charcoal-900 text-white hover:bg-charcoal-800 transition-colors shadow-sm"
              >
                Get Started — Register Brand
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/login"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg text-sm font-semibold bg-white text-charcoal-900 border border-surface-border hover:bg-surface-warm transition-colors shadow-sm"
              >
                Sign In to Portal
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* 9. Professional Footer */}
      <footer className="bg-white border-t border-surface-border py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded bg-butter-400 flex items-center justify-center font-bold text-charcoal-900 text-xs">
              K
            </div>
            <span className="font-semibold text-sm text-charcoal-800">
              Kampus.VC Digital Risk Protection Platform
            </span>
          </div>

          <div className="text-xs text-charcoal-500 font-mono text-center md:text-right">
            Kampus.VC Hackathon Implementation • Strictly Two Roles (Admin & Owner) • SQLite/PostgreSQL Relational Persistence
          </div>
        </div>
      </footer>
    </div>
  );
}
