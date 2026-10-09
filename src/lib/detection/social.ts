import { analyzeLookalikeName, normalizeName } from "./lookalike.ts";
import { calculateExplainableRiskScore } from "./scoring.ts";
import type { SignalInput, ScoreExplanation } from "./scoring.ts";

export interface SocialCandidate {
  platform: "twitter" | "instagram" | "facebook" | "linkedin" | "telegram" | "youtube" | string;
  handle: string;
  displayName: string;
  profileUrl: string;
  bio?: string;
  outboundUrl?: string;
  isVerifiedBadge?: boolean;
  avatarUrl?: string;
  sourceType: "live" | "manual" | "cached" | "fixture";
  retrievedAt: string;
}

export interface OfficialAssetItem {
  id?: string;
  assetType?: string;
  asset_type?: string;
  platform?: string;
  identifier: string;
  url?: string | null;
  isVerified?: boolean;
  is_verified?: number | boolean;
}

/**
 * Normalizes user-supplied handle or profile URL for official social assets.
 */
export function normalizeSocialAsset(
  platform: string,
  input: string
): { platform: string; identifier: string; url: string } | null {
  if (!input || !input.trim()) return null;
  const raw = input.trim();
  const lowerPlat = platform.toLowerCase();

  let handle = raw;
  let url = raw;

  if (lowerPlat === "twitter" || lowerPlat === "x") {
    const urlMatch = raw.match(/(?:x\.com|twitter\.com)\/([a-zA-Z0-9_]+)/i);
    if (urlMatch) {
      handle = `@${urlMatch[1]}`;
      url = `https://x.com/${urlMatch[1]}`;
    } else {
      const clean = raw.replace(/^@/, "").replace(/\/+$/, "");
      handle = `@${clean}`;
      url = `https://x.com/${clean}`;
    }
    return { platform: "twitter", identifier: handle, url };
  }

  if (lowerPlat === "instagram") {
    const urlMatch = raw.match(/instagram\.com\/([a-zA-Z0-9_.]+)/i);
    if (urlMatch) {
      handle = `@${urlMatch[1]}`;
      url = `https://instagram.com/${urlMatch[1]}`;
    } else {
      const clean = raw.replace(/^@/, "").replace(/\/+$/, "");
      handle = `@${clean}`;
      url = `https://instagram.com/${clean}`;
    }
    return { platform: "instagram", identifier: handle, url };
  }

  if (lowerPlat === "facebook") {
    const urlMatch = raw.match(/facebook\.com\/([a-zA-Z0-9_.-]+)/i);
    if (urlMatch) {
      handle = urlMatch[1];
      url = `https://facebook.com/${urlMatch[1]}`;
    } else {
      const clean = raw.replace(/^@/, "").replace(/\/+$/, "");
      handle = clean;
      url = clean.startsWith("http") ? clean : `https://facebook.com/${clean}`;
    }
    return { platform: "facebook", identifier: handle, url };
  }

  if (lowerPlat === "linkedin") {
    const urlMatch = raw.match(/linkedin\.com\/(?:company|in)\/([a-zA-Z0-9_.-]+)/i);
    if (urlMatch) {
      handle = urlMatch[1];
      url = `https://linkedin.com/company/${urlMatch[1]}`;
    } else {
      const clean = raw.replace(/^@/, "").replace(/\/+$/, "");
      handle = clean;
      url = clean.startsWith("http") ? clean : `https://linkedin.com/company/${clean}`;
    }
    return { platform: "linkedin", identifier: handle, url };
  }

  if (lowerPlat === "youtube") {
    const urlMatch = raw.match(/youtube\.com\/(?:@|channel\/|c\/)?([a-zA-Z0-9_.-]+)/i);
    if (urlMatch) {
      handle = `@${urlMatch[1].replace(/^@/, "")}`;
      url = `https://youtube.com/@${urlMatch[1].replace(/^@/, "")}`;
    } else {
      const clean = raw.replace(/^@/, "").replace(/\/+$/, "");
      handle = `@${clean}`;
      url = `https://youtube.com/@${clean}`;
    }
    return { platform: "youtube", identifier: handle, url };
  }

  return {
    platform: lowerPlat,
    identifier: raw.startsWith("http") ? raw.split("/").filter(Boolean).pop() || raw : raw,
    url: raw.startsWith("http") ? raw : `https://${lowerPlat}.com/${raw.replace(/^@/, "")}`,
  };
}

/**
 * Extracts and normalizes structured social entries from various input formats.
 */
export function extractSocialEntries(
  socialHandles: any
): Array<{ platform: string; identifier: string; url: string }> {
  if (!socialHandles) return [];

  const results: Array<{ platform: string; identifier: string; url: string }> = [];

  if (Array.isArray(socialHandles)) {
    for (const item of socialHandles) {
      if (!item) continue;
      const plat = item.platform || item.asset_type || "twitter";
      const val = item.identifier || item.handle || item.url;
      if (val) {
        const norm = normalizeSocialAsset(plat, val);
        if (norm) results.push(norm);
      }
    }
    return results;
  }

  if (typeof socialHandles === "object") {
    const platforms = ["twitter", "instagram", "facebook", "linkedin", "youtube"] as const;
    for (const plat of platforms) {
      const val = socialHandles[plat];
      if (val && typeof val === "string" && val.trim()) {
        const norm = normalizeSocialAsset(plat, val.trim());
        if (norm) results.push(norm);
      }
    }
  }

  return results;
}

export interface SocialFindingResult {
  isThreat: boolean;
  isExcludedOfficial: boolean;
  exclusionReason?: string;
  platform: string;
  candidate: SocialCandidate;
  matchedBrand: string;
  riskScore: number;
  similarityScore: number;
  confidence: "low" | "medium" | "high";
  matchTypes: string[];
  evidence: ScoreExplanation;
  suggestedAction: string;
}

const PHISHING_BIO_KEYWORDS = [
  "dm for help",
  "customer support",
  "help desk",
  "official support",
  "customer service",
  "claim reward",
  "claim rewards",
  "airdrop",
  "bonus claim",
  "send dm",
  "wallet support",
  "recovery assist",
  "security update",
  "verify wallet",
  "reset password",
];

export function analyzeSocialCandidate(
  candidate: SocialCandidate,
  brandName: string,
  officialAssets: OfficialAssetItem[] = []
): SocialFindingResult {
  const normCandidateHandle = candidate.handle.replace(/^@/, "").toLowerCase().trim();
  const normCandidateUrl = candidate.profileUrl.toLowerCase().trim();

  // 1. Check Official Asset Exclusion Gate
  // If this matches an official verified account, NEVER flag it!
  const matchingOfficialAsset = officialAssets.find((asset) => {
    const isSocial = asset.assetType === "social" || (asset as any).asset_type === "social";
    if (isSocial) {
      const assetHandle = asset.identifier.replace(/^@/, "").toLowerCase().trim();
      const assetPlat = (asset.platform || "").toLowerCase().trim();
      const candPlat = (candidate.platform || "").toLowerCase().trim();

      const platMatch =
        !assetPlat ||
        !candPlat ||
        assetPlat === candPlat ||
        (assetPlat === "x" && candPlat === "twitter") ||
        (assetPlat === "twitter" && candPlat === "x");

      if (platMatch && assetHandle === normCandidateHandle) return true;

      if (asset.url) {
        const normAssetUrl = asset.url
          .toLowerCase()
          .trim()
          .replace(/\/+$/, "")
          .replace("twitter.com", "x.com");
        const normCandUrl = normCandidateUrl
          .replace(/\/+$/, "")
          .replace("twitter.com", "x.com");

        if (normAssetUrl === normCandUrl) return true;
        if (normCandUrl.endsWith(`/${assetHandle}`) || normAssetUrl.endsWith(`/${normCandidateHandle}`)) return true;
      }
    }
    return false;
  });

  if (matchingOfficialAsset) {
    return {
      isThreat: false,
      isExcludedOfficial: true,
      exclusionReason: `Official asset match: Confirmed organization profile [${matchingOfficialAsset.identifier}]. Excluded from threats.`,
      platform: candidate.platform,
      candidate,
      matchedBrand: brandName,
      riskScore: 0,
      similarityScore: 100,
      confidence: "high",
      matchTypes: ["verified_official_asset"],
      evidence: {
        overallRiskScore: 0,
        similarityScore: 100,
        confidence: "high",
        severity: "benign",
        signals: [],
        missingSignals: [],
        rationale: "Account identity confirmed as registered official brand asset. Automatically excluded from threat detection.",
      },
      suggestedAction: "No action required. Confirmed legitimate property.",
    };
  }

  // Known legitimate aliases
  const aliases = officialAssets
    .filter((a) => a.assetType === "alias")
    .map((a) => a.identifier);

  // 2. Evaluate Name Similarity via Look-alike Engine
  const handleLookalike = analyzeLookalikeName(normCandidateHandle, brandName, aliases);
  const displayLookalike = analyzeLookalikeName(candidate.displayName, brandName, aliases);

  // Pick stronger match
  const primaryMatch = handleLookalike.similarityScore >= displayLookalike.similarityScore ? handleLookalike : displayLookalike;

  // If candidate is a registered legitimate alias
  if (primaryMatch.isLegitimateAlias) {
    return {
      isThreat: false,
      isExcludedOfficial: true,
      exclusionReason: "Matches registered organization brand alias / subsidiary name.",
      platform: candidate.platform,
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
        rationale: "Candidate matches documented legitimate brand alias.",
      },
      suggestedAction: "No action required.",
    };
  }

  // 3. Phishing Bio Keywords Signal
  let bioScore = 0;
  const bioNotes: string[] = [];
  if (candidate.bio) {
    const lowerBio = candidate.bio.toLowerCase();
    const detectedKeywords = PHISHING_BIO_KEYWORDS.filter((kw) => lowerBio.includes(kw));
    if (detectedKeywords.length > 0) {
      bioScore = Math.min(100, 50 + detectedKeywords.length * 20);
      bioNotes.push(`Deceptive support/phishing phrases detected: "${detectedKeywords.join('", "')}"`);
    } else {
      bioScore = 15;
      bioNotes.push("Bio present without flagged deception phrases.");
    }
  }

  // 4. Outbound URL Signal
  let urlScore = 0;
  const urlNotes: string[] = [];
  const officialDomains = officialAssets
    .filter((a) => a.assetType === "domain")
    .map((a) => a.identifier.toLowerCase().trim());

  if (candidate.outboundUrl) {
    try {
      const parsed = new URL(candidate.outboundUrl);
      const host = parsed.hostname.toLowerCase();
      const isOfficialDomain = officialDomains.some((d) => host === d || host.endsWith(`.${d}`));
      if (isOfficialDomain) {
        urlScore = 10;
        urlNotes.push(`Links to authorized official domain (${host}).`);
      } else {
        // Unofficial external link
        urlScore = 80;
        urlNotes.push(`Suspicious external redirect to unauthorized destination: ${candidate.outboundUrl}`);
      }
    } catch {
      urlScore = 70;
      urlNotes.push(`Malformed or obfuscated outbound URL: ${candidate.outboundUrl}`);
    }
  }

  // 5. Unverified Account Claiming Official Status Signal
  let badgeScore = 0;
  let badgeNotes = "";
  if (!candidate.isVerifiedBadge) {
    const claimsOfficial =
      candidate.displayName.toLowerCase().includes("official") ||
      candidate.displayName.toLowerCase().includes("support") ||
      (candidate.bio && candidate.bio.toLowerCase().includes("official"));
    if (claimsOfficial) {
      badgeScore = 90;
      badgeNotes = "Unverified profile actively claims official brand or support authority.";
    } else {
      badgeScore = 30;
      badgeNotes = "Unverified standard profile without overt authority claims.";
    }
  } else {
    badgeScore = 10;
    badgeNotes = "Platform verified badge present.";
  }

  // 6. Build Signals Array for Scoring Engine
  const signals: SignalInput[] = [
    {
      name: "Handle / Name Look-alike Deception",
      category: "name_similarity",
      available: true,
      score: primaryMatch.riskScore,
      baseWeight: 0.35,
      evidenceNotes: primaryMatch.transformations.join("; "),
    },
    {
      name: "Unverified Entity Authority Claim",
      category: "publisher_entity",
      available: true,
      score: badgeScore,
      baseWeight: 0.25,
      evidenceNotes: badgeNotes,
    },
    {
      name: "Social Bio Deception Keywords",
      category: "bio_keywords",
      available: Boolean(candidate.bio),
      score: bioScore,
      baseWeight: 0.20,
      evidenceNotes: bioNotes.join("; "),
    },
    {
      name: "Outbound Redirect / Phishing Link",
      category: "outbound_url",
      available: Boolean(candidate.outboundUrl),
      score: urlScore,
      baseWeight: 0.20,
      evidenceNotes: urlNotes.join("; "),
    },
  ];

  const evidence = calculateExplainableRiskScore(signals, primaryMatch.similarityScore);

  const matchTypes = [...primaryMatch.matchTypes];
  if (bioScore >= 60) matchTypes.push("phishing_bio_keywords");
  if (urlScore >= 60) matchTypes.push("suspicious_redirect");
  if (badgeScore >= 80) matchTypes.push("unverified_authority_spoof");

  const isThreat = evidence.overallRiskScore >= 40 && primaryMatch.similarityScore >= 60;

  let suggestedAction = "Monitor profile for activity changes.";
  if (evidence.overallRiskScore >= 80) {
    suggestedAction = "Initiate immediate brand impersonation takedown notice with platform abuse team.";
  } else if (evidence.overallRiskScore >= 60) {
    suggestedAction = "Request community warning label or dispatch cease-and-desist advisory.";
  }

  return {
    isThreat,
    isExcludedOfficial: false,
    platform: candidate.platform,
    candidate,
    matchedBrand: brandName,
    riskScore: evidence.overallRiskScore,
    similarityScore: primaryMatch.similarityScore,
    confidence: evidence.confidence,
    matchTypes,
    evidence,
    suggestedAction,
  };
}
