import { analyzeSocialCandidate, SocialCandidate } from "./social";
import { analyzeAppCandidate, AppCandidate } from "./appstore";
import { analyzeLookalikeName } from "./lookalike";

export interface EvaluationItem {
  id: string;
  type: "social" | "app" | "lookalike";
  brandName: string;
  officialPublisher?: string;
  officialAssets: {
    id: string;
    assetType: string;
    platform?: string;
    identifier: string;
    url?: string;
    isVerified: boolean;
  }[];
  candidate: SocialCandidate | AppCandidate | { name: string };
  expectedLabel: "threat" | "benign"; // Ground truth
  caseDescription: string;
}

export const EVALUATION_BENCHMARK_DATASET: EvaluationItem[] = [
  // 1. Social: Exact Official Account (Negative - MUST NOT FLAG)
  {
    id: "eval_soc_01",
    type: "social",
    brandName: "NovaPay",
    officialAssets: [
      { id: "a1", assetType: "social", platform: "twitter", identifier: "@NovaPayOfficial", isVerified: true },
      { id: "a2", assetType: "domain", identifier: "novapay.io", isVerified: true },
    ],
    candidate: {
      platform: "twitter",
      handle: "@NovaPayOfficial",
      displayName: "NovaPay Official",
      profileUrl: "https://x.com/NovaPayOfficial",
      bio: "Official global payments network.",
      outboundUrl: "https://novapay.io",
      isVerifiedBadge: true,
      sourceType: "fixture",
      retrievedAt: new Date().toISOString(),
    },
    expectedLabel: "benign",
    caseDescription: "Exact verified official handle (Verification exclusion test)",
  },

  // 2. Social: Homoglyph Character Impersonator (Positive - MUST FLAG)
  {
    id: "eval_soc_02",
    type: "social",
    brandName: "NovaPay",
    officialAssets: [
      { id: "a1", assetType: "social", platform: "twitter", identifier: "@NovaPayOfficial", isVerified: true },
      { id: "a2", assetType: "domain", identifier: "novapay.io", isVerified: true },
    ],
    candidate: {
      platform: "twitter",
      // Notice Cyrillic 'о' (\u043E) and Cyrillic 'а' (\u0430)
      handle: "@N\u043Ev\u0430Pay_HelpDesk",
      displayName: "NovaPay Customer Care & Recovery",
      profileUrl: "https://x.com/NovayPay_HelpDesk",
      bio: "Official support desk for NovaPay. Send dm for help and wallet recovery.",
      outboundUrl: "https://novapay-claim-portal.xyz/login",
      isVerifiedBadge: false,
      sourceType: "fixture",
      retrievedAt: new Date().toISOString(),
    },
    expectedLabel: "threat",
    caseDescription: "Cyrillic homoglyph handle with phishing bio keywords and external spoof portal",
  },

  // 3. Social: Leetspeak Character Swap (Positive - MUST FLAG)
  {
    id: "eval_soc_03",
    type: "social",
    brandName: "NovaPay",
    officialAssets: [
      { id: "a1", assetType: "social", platform: "twitter", identifier: "@NovaPayOfficial", isVerified: true },
    ],
    candidate: {
      platform: "twitter",
      handle: "@N0vaP@yOfficial",
      displayName: "NovaPay Giveaways & Bonus",
      profileUrl: "https://x.com/N0vaPayOfficial",
      bio: "NovaPay official rewards center. Airdrop claim rewards here.",
      outboundUrl: "https://novapay-airdrop.net",
      isVerifiedBadge: false,
      sourceType: "fixture",
      retrievedAt: new Date().toISOString(),
    },
    expectedLabel: "threat",
    caseDescription: "Leetspeak substitution (0 for o, @ for a) with phishing reward claim",
  },

  // 4. Social: Documented Legitimate Alias (Negative - MUST NOT FLAG)
  {
    id: "eval_soc_04",
    type: "social",
    brandName: "NovaPay",
    officialAssets: [
      { id: "a1", assetType: "social", platform: "twitter", identifier: "@NovaPayOfficial", isVerified: true },
      { id: "a2", assetType: "alias", platform: "text", identifier: "Nova Pay", isVerified: true },
      { id: "a3", assetType: "alias", platform: "text", identifier: "NovaPay Wallet", isVerified: true },
    ],
    candidate: {
      platform: "twitter",
      handle: "@NovaPayWallet",
      displayName: "NovaPay Wallet Updates",
      profileUrl: "https://x.com/NovaPayWallet",
      bio: "Official product updates for NovaPay Wallet app.",
      isVerifiedBadge: true,
      sourceType: "fixture",
      retrievedAt: new Date().toISOString(),
    },
    expectedLabel: "benign",
    caseDescription: "Authorized product brand alias registered in official assets",
  },

  // 5. Social: Unrelated Similar Entity (Negative - MUST NOT FLAG)
  {
    id: "eval_soc_05",
    type: "social",
    brandName: "NovaPay",
    officialAssets: [
      { id: "a1", assetType: "social", platform: "twitter", identifier: "@NovaPayOfficial", isVerified: true },
    ],
    candidate: {
      platform: "twitter",
      handle: "@SupernovaAstro",
      displayName: "Supernova Astronomy Society",
      profileUrl: "https://x.com/SupernovaAstro",
      bio: "Stargazing and deep space telescopes in Chile.",
      outboundUrl: "https://supernova.org",
      isVerifiedBadge: false,
      sourceType: "fixture",
      retrievedAt: new Date().toISOString(),
    },
    expectedLabel: "benign",
    caseDescription: "Distinct linguistic entity containing substring 'nova' in astronomy context",
  },

  // 6. App Store: Exact Official App Listing (Negative - MUST NOT FLAG)
  {
    id: "eval_app_01",
    type: "app",
    brandName: "NovaPay",
    officialPublisher: "NovaPay Global Inc",
    officialAssets: [
      { id: "a1", assetType: "app", platform: "play_store", identifier: "com.novapay.wallet", isVerified: true },
    ],
    candidate: {
      store: "play_store",
      appName: "NovaPay: Global Send & Save",
      packageId: "com.novapay.wallet",
      publisher: "NovaPay Global Inc",
      storeUrl: "https://play.google.com/store/apps/details?id=com.novapay.wallet",
      description: "Official mobile application of NovaPay Global.",
      sourceType: "fixture",
      retrievedAt: new Date().toISOString(),
    },
    expectedLabel: "benign",
    caseDescription: "Exact verified official Android application package",
  },

  // 7. App Store: Rogue Fake APK Cloned Package ID (Positive - MUST FLAG)
  {
    id: "eval_app_02",
    type: "app",
    brandName: "NovaPay",
    officialPublisher: "NovaPay Global Inc",
    officialAssets: [
      { id: "a1", assetType: "app", platform: "play_store", identifier: "com.novapay.wallet", isVerified: true },
    ],
    candidate: {
      store: "play_store",
      appName: "NovaPay Wallet - Instant Loan & Bonus",
      packageId: "com.novapay.wallet.security.update",
      publisher: "Apex Nova Dev Studio",
      storeUrl: "https://play.google.com/store/apps/details?id=com.novapay.wallet.security.update",
      description: "Instant wallet recovery. Enter your seed phrase and private key for instant activation.",
      sourceType: "fixture",
      retrievedAt: new Date().toISOString(),
    },
    expectedLabel: "threat",
    caseDescription: "Rogue APK copying package namespace with publisher mismatch and seed phrase harvesting",
  },

  // 8. App Store: Look-alike Title with Different Developer (Positive - MUST FLAG)
  {
    id: "eval_app_03",
    type: "app",
    brandName: "NovaPay",
    officialPublisher: "NovaPay Global Inc",
    officialAssets: [
      { id: "a1", assetType: "app", platform: "play_store", identifier: "com.novapay.wallet", isVerified: true },
    ],
    candidate: {
      store: "play_store",
      appName: "Nova-Pay Quick Credit & Send",
      packageId: "com.quickcredit.novapay",
      publisher: "FinTech Fast Solutions Ltd",
      storeUrl: "https://play.google.com/store/apps/details?id=com.quickcredit.novapay",
      description: "Fast transfers and loans. Unofficial companion tool for NovaPay users.",
      sourceType: "fixture",
      retrievedAt: new Date().toISOString(),
    },
    expectedLabel: "threat",
    caseDescription: "Hyphenated brand name spoofing by unauthorized third-party entity",
  },

  // 9. App Store: Unrelated Financial Utility (Negative - MUST NOT FLAG)
  {
    id: "eval_app_04",
    type: "app",
    brandName: "NovaPay",
    officialPublisher: "NovaPay Global Inc",
    officialAssets: [
      { id: "a1", assetType: "app", platform: "play_store", identifier: "com.novapay.wallet", isVerified: true },
    ],
    candidate: {
      store: "play_store",
      appName: "Renovate Home Planner",
      packageId: "com.renovate.homeplanner",
      publisher: "Architecture Digital",
      storeUrl: "https://play.google.com/store/apps/details?id=com.renovate.homeplanner",
      description: "Plan kitchen and living room remodels with 3D models.",
      sourceType: "fixture",
      retrievedAt: new Date().toISOString(),
    },
    expectedLabel: "benign",
    caseDescription: "Unrelated home improvement app containing letter substring 'nova'",
  },

  // 10. Look-alike Name: Character Transposition (Positive - MUST FLAG)
  {
    id: "eval_look_01",
    type: "lookalike",
    brandName: "NovaPay",
    officialAssets: [],
    candidate: { name: "NoavPay" }, // 'av' swapped with 'va'
    expectedLabel: "threat",
    caseDescription: "Single adjacent character transposition typo-squat",
  },

  // 11. Look-alike Name: Inserted Character (Positive - MUST FLAG)
  {
    id: "eval_look_02",
    type: "lookalike",
    brandName: "NovaPay",
    officialAssets: [],
    candidate: { name: "NovaaPay" },
    expectedLabel: "threat",
    caseDescription: "Duplicate inserted character 'a'",
  },

  // 12. Look-alike Name: Punctuation Insertion (Positive - MUST FLAG)
  {
    id: "eval_look_03",
    type: "lookalike",
    brandName: "NovaPay",
    officialAssets: [],
    candidate: { name: "Nova_Pay-Official" },
    expectedLabel: "threat",
    caseDescription: "Delimiters with suspicious official suffix",
  },

  // 13. Look-alike Name: Unrelated Generic Word (Negative - MUST NOT FLAG)
  {
    id: "eval_look_04",
    type: "lookalike",
    brandName: "NovaPay",
    officialAssets: [],
    candidate: { name: "StarPay Direct" },
    expectedLabel: "benign",
    caseDescription: "Generic payment competitor with completely distinct brand stem",
  },
];

export interface BenchmarkMetrics {
  totalItems: number;
  truePositives: number;
  falsePositives: number;
  trueNegatives: number;
  falseNegatives: number;
  precision: number; // 0 to 1
  recall: number; // 0 to 1
  f1Score: number; // 0 to 1
  accuracy: number; // 0 to 1
  results: {
    id: string;
    description: string;
    expected: "threat" | "benign";
    predicted: "threat" | "benign";
    passed: boolean;
    riskScore: number;
    matchTypes: string[];
  }[];
  limitationsDisclosure: string;
}

export function runBenchmarkEvaluation(): BenchmarkMetrics {
  let tp = 0;
  let fp = 0;
  let tn = 0;
  let fn = 0;

  const results = EVALUATION_BENCHMARK_DATASET.map((item) => {
    let predicted: "threat" | "benign" = "benign";
    let riskScore = 0;
    let matchTypes: string[] = [];

    if (item.type === "social") {
      const res = analyzeSocialCandidate(item.candidate as SocialCandidate, item.brandName, item.officialAssets);
      predicted = res.isThreat ? "threat" : "benign";
      riskScore = res.riskScore;
      matchTypes = res.matchTypes;
    } else if (item.type === "app") {
      const res = analyzeAppCandidate(
        item.candidate as AppCandidate,
        item.brandName,
        item.officialAssets,
        item.officialPublisher || ""
      );
      predicted = res.isThreat ? "threat" : "benign";
      riskScore = res.riskScore;
      matchTypes = res.matchTypes;
    } else {
      const candidateName = (item.candidate as any).name;
      const res = analyzeLookalikeName(candidateName, item.brandName);
      predicted = res.isMatch && res.riskScore >= 45 ? "threat" : "benign";
      riskScore = res.riskScore;
      matchTypes = res.matchTypes;
    }

    if (item.expectedLabel === "threat" && predicted === "threat") tp++;
    else if (item.expectedLabel === "benign" && predicted === "threat") fp++;
    else if (item.expectedLabel === "benign" && predicted === "benign") tn++;
    else if (item.expectedLabel === "threat" && predicted === "benign") fn++;

    return {
      id: item.id,
      description: item.caseDescription,
      expected: item.expectedLabel,
      predicted,
      passed: item.expectedLabel === predicted,
      riskScore,
      matchTypes,
    };
  });

  const total = EVALUATION_BENCHMARK_DATASET.length;
  const precision = tp + fp > 0 ? tp / (tp + fp) : 1;
  const recall = tp + fn > 0 ? tp / (tp + fn) : 1;
  const f1Score = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;
  const accuracy = (tp + tn) / total;

  return {
    totalItems: total,
    truePositives: tp,
    falsePositives: fp,
    trueNegatives: tn,
    falseNegatives: fn,
    precision: Math.round(precision * 1000) / 1000,
    recall: Math.round(recall * 1000) / 1000,
    f1Score: Math.round(f1Score * 1000) / 1000,
    accuracy: Math.round(accuracy * 1000) / 1000,
    results,
    limitationsDisclosure:
      "Benchmark evaluated against a curated deterministic test corpus of 13 labeled test vectors representing homoglyphs, transpositions, verified asset exclusions, and third-party publisher anomalies. Real-world performance on billions of unindexed web surfaces may exhibit variance due to novel obfuscations and platform-specific throttling.",
  };
}
