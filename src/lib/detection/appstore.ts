import { analyzeLookalikeName } from "./lookalike.ts";
import { calculateExplainableRiskScore } from "./scoring.ts";
import type { SignalInput, ScoreExplanation } from "./scoring.ts";
import type { OfficialAssetItem } from "./social.ts";

export interface AppCandidate {
  store: "play_store" | "app_store";
  appName: string;
  packageId: string; // Android package name or iOS bundle ID / appId
  publisher: string;
  storeUrl: string;
  iconUrl?: string;
  description?: string;
  privacyPolicyUrl?: string;
  permissions?: string[];
  sourceType: "live" | "manual" | "cached" | "fixture";
  retrievedAt: string;
}

export interface AppFindingResult {
  isThreat: boolean;
  isExcludedOfficial: boolean;
  exclusionReason?: string;
  store: "play_store" | "app_store";
  candidate: AppCandidate;
  matchedBrand: string;
  riskScore: number;
  similarityScore: number;
  confidence: "low" | "medium" | "high";
  matchTypes: string[];
  evidence: ScoreExplanation;
  suggestedAction: string;
}

const SUSPICIOUS_APP_TERMS = [
  "seed phrase",
  "private key",
  "instant loan",
  "wallet recovery",
  "login without 2fa",
  "gift card generator",
  "free bonus credits",
  "customer care hotline",
];

export function analyzeAppCandidate(
  candidate: AppCandidate,
  brandName: string,
  officialAssets: OfficialAssetItem[] = [],
  officialPublisher: string = ""
): AppFindingResult {
  const normPackageId = candidate.packageId.toLowerCase().trim();
  const normStoreUrl = candidate.storeUrl.toLowerCase().trim();

  // 1. Official App Exclusion Gate
  const matchingOfficialApp = officialAssets.find((asset) => {
    if (asset.assetType === "app") {
      const iden = asset.identifier.toLowerCase().trim();
      if (iden === normPackageId) return true;
      if (asset.url && asset.url.toLowerCase().trim() === normStoreUrl) return true;
    }
    return false;
  });

  if (matchingOfficialApp) {
    return {
      isThreat: false,
      isExcludedOfficial: true,
      exclusionReason: `Official asset match: Confirmed organization application listing [${matchingOfficialApp.identifier}]. Excluded from threats.`,
      store: candidate.store,
      candidate,
      matchedBrand: brandName,
      riskScore: 0,
      similarityScore: 100,
      confidence: "high",
      matchTypes: ["verified_official_app"],
      evidence: {
        overallRiskScore: 0,
        similarityScore: 100,
        confidence: "high",
        severity: "benign",
        signals: [],
        missingSignals: [],
        rationale: "Application package confirmed as registered official organization app. Automatically excluded from threat detection.",
      },
      suggestedAction: "No action required. Confirmed legitimate property.",
    };
  }

  // Known legitimate aliases
  const aliases = officialAssets
    .filter((a) => a.assetType === "alias")
    .map((a) => a.identifier);

  // 2. Name Similarity
  const nameMatch = analyzeLookalikeName(candidate.appName, brandName, aliases);

  if (nameMatch.isLegitimateAlias) {
    return {
      isThreat: false,
      isExcludedOfficial: true,
      exclusionReason: "Application matches authorized brand alias variation.",
      store: candidate.store,
      candidate,
      matchedBrand: brandName,
      riskScore: 0,
      similarityScore: 100,
      confidence: "high",
      matchTypes: ["legitimate_alias"],
      evidence: {
        overallRiskScore: 0,
        similarityScore: 100,
        confidence: "high",
        severity: "benign",
        signals: [],
        missingSignals: [],
        rationale: "Matches registered organization brand alias.",
      },
      suggestedAction: "No action required.",
    };
  }

  // 3. Publisher / Developer Entity Discrepancy Signal
  // Note: Different publisher is a risk signal, not automatic proof of malicious intent!
  let publisherScore = 0;
  let publisherNotes = "";
  const normCandidatePublisher = candidate.publisher.toLowerCase().trim();
  const normOfficialPublisher = officialPublisher.toLowerCase().trim();

  if (officialPublisher && normCandidatePublisher.length > 0) {
    if (normCandidatePublisher === normOfficialPublisher) {
      publisherScore = 0;
      publisherNotes = "Publisher matches documented official entity.";
    } else {
      // Publisher discrepancy
      const pubMatch = analyzeLookalikeName(candidate.publisher, brandName, aliases);
      if (pubMatch.similarityScore >= 80) {
        publisherScore = 85;
        publisherNotes = `Publisher name "${candidate.publisher}" closely mimics brand entity "${officialPublisher}". High spoofing indicator.`;
      } else {
        publisherScore = 60;
        publisherNotes = `Third-party developer entity "${candidate.publisher}" differs from official entity "${officialPublisher}". Risk signal indicating potential unauthorized client.`;
      }
    }
  } else {
    // Publisher signal unverified
    publisherScore = 40;
    publisherNotes = `Developer listed as "${candidate.publisher}". No official developer baseline recorded for comparison.`;
  }

  // 4. Package Identifier (Bundle ID) Spoofing Signal
  let packageScore = 0;
  let packageNotes = "";
  const brandSlug = brandName.toLowerCase().replace(/[^a-z0-9]/g, "");

  if (normPackageId.includes(brandSlug)) {
    // Official app package prefix comparison
    const officialPackageIds = officialAssets
      .filter((a) => a.assetType === "app")
      .map((a) => a.identifier.toLowerCase().trim());

    const isPackageClone = officialPackageIds.some((officialId) => {
      return normPackageId.startsWith(officialId) || officialId.startsWith(normPackageId);
    });

    if (isPackageClone) {
      packageScore = 95;
      packageNotes = `Package identifier "${candidate.packageId}" directly clones official namespace prefix. Aggressive spoofing marker.`;
    } else {
      packageScore = 75;
      packageNotes = `Package identifier "${candidate.packageId}" incorporates brand namespace without authorization.`;
    }
  } else {
    packageScore = 20;
    packageNotes = "Package identifier uses distinct namespace.";
  }

  // 5. Description & Permissions Deception Signal
  let descScore = 0;
  const descNotes: string[] = [];
  if (candidate.description) {
    const lowerDesc = candidate.description.toLowerCase();
    const flaggedTerms = SUSPICIOUS_APP_TERMS.filter((term) => lowerDesc.includes(term));
    if (flaggedTerms.length > 0) {
      descScore = Math.min(100, 60 + flaggedTerms.length * 15);
      descNotes.push(`Store description contains high-risk fraud keywords: "${flaggedTerms.join('", "')}"`);
    } else {
      descScore = 15;
      descNotes.push("Description inspected without high-risk fraud keywords.");
    }
  }

  // 6. Build Signals Array for Scoring Engine
  const signals: SignalInput[] = [
    {
      name: "Application Title Look-alike Match",
      category: "name_similarity",
      available: true,
      score: nameMatch.riskScore,
      baseWeight: 0.35,
      evidenceNotes: nameMatch.transformations.join("; "),
    },
    {
      name: "Developer / Publisher Entity Mismatch",
      category: "publisher_entity",
      available: Boolean(candidate.publisher),
      score: publisherScore,
      baseWeight: 0.25,
      evidenceNotes: publisherNotes,
    },
    {
      name: "Package / Bundle Identifier Namespace Spoof",
      category: "name_similarity",
      available: Boolean(candidate.packageId),
      score: packageScore,
      baseWeight: 0.25,
      evidenceNotes: packageNotes,
    },
    {
      name: "Listing Description & Permission Risk",
      category: "bio_keywords",
      available: Boolean(candidate.description),
      score: descScore,
      baseWeight: 0.15,
      evidenceNotes: descNotes.join("; "),
    },
  ];

  const evidence = calculateExplainableRiskScore(signals, nameMatch.similarityScore);

  const matchTypes = [...nameMatch.matchTypes];
  if (publisherScore >= 60) matchTypes.push("publisher_mismatch");
  if (packageScore >= 70) matchTypes.push("package_id_spoof");
  if (descScore >= 60) matchTypes.push("suspicious_app_description");

  const isThreat = evidence.overallRiskScore >= 40 && nameMatch.similarityScore >= 55;

  let suggestedAction = "Monitor application listing for suspicious permission updates.";
  if (evidence.overallRiskScore >= 80) {
    suggestedAction = "Submit urgent DMCA copyright/trademark infringement takedown to Google Play / Apple Store Review teams.";
  } else if (evidence.overallRiskScore >= 60) {
    suggestedAction = "Issue developer identity notice and notify customer base of rogue third-party APK.";
  }

  return {
    isThreat,
    isExcludedOfficial: false,
    store: candidate.store,
    candidate,
    matchedBrand: brandName,
    riskScore: evidence.overallRiskScore,
    similarityScore: nameMatch.similarityScore,
    confidence: evidence.confidence,
    matchTypes,
    evidence,
    suggestedAction,
  };
}
