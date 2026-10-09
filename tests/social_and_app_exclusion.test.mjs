import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { analyzeSocialCandidate } from "../src/lib/detection/social.ts";
import { analyzeAppCandidate } from "../src/lib/detection/appstore.ts";

describe("Social Media and App Store Detection with Official Asset Exclusion", () => {
  const officialAssets = [
    { id: "a1", assetType: "social", platform: "twitter", identifier: "@NovaPayOfficial", url: "https://x.com/NovaPayOfficial", isVerified: true },
    { id: "a2", assetType: "domain", identifier: "novapay.io", url: "https://novapay.io", isVerified: true },
    { id: "a3", assetType: "app", platform: "play_store", identifier: "com.novapay.wallet", url: "https://play.google.com/store/apps/details?id=com.novapay.wallet", isVerified: true },
    { id: "a4", assetType: "alias", identifier: "Nova Pay", isVerified: true },
  ];

  it("EXCLUDES official social account from threat detection", () => {
    const candidate = {
      platform: "twitter",
      handle: "@NovaPayOfficial",
      displayName: "NovaPay Official",
      profileUrl: "https://x.com/NovaPayOfficial",
      bio: "Official payments network.",
      isVerifiedBadge: true,
      sourceType: "fixture",
      retrievedAt: new Date().toISOString(),
    };

    const result = analyzeSocialCandidate(candidate, "NovaPay", officialAssets);
    assert.equal(result.isThreat, false);
    assert.equal(result.isExcludedOfficial, true);
    assert.equal(result.riskScore, 0);
    assert.ok(result.exclusionReason.includes("Official asset match"));
  });

  it("FLAGS social candidate with homoglyphs and phishing bio keywords", () => {
    const candidate = {
      platform: "twitter",
      handle: "@N\u043Ev\u0430Pay_HelpDesk",
      displayName: "NovaPay Official Support Desk",
      profileUrl: "https://x.com/NovaPay_HelpDesk",
      bio: "Official customer care. Send dm for help and recovery.",
      outboundUrl: "https://unauthorized-phishing-site.xyz/login",
      isVerifiedBadge: false,
      sourceType: "fixture",
      retrievedAt: new Date().toISOString(),
    };

    const result = analyzeSocialCandidate(candidate, "NovaPay", officialAssets);
    assert.equal(result.isThreat, true);
    assert.equal(result.isExcludedOfficial, false);
    assert.ok(result.riskScore >= 75);
    assert.ok(result.matchTypes.includes("phishing_bio_keywords"));
    assert.ok(result.matchTypes.includes("suspicious_redirect"));
  });

  it("EXCLUDES official Android application package from threat detection", () => {
    const candidate = {
      store: "play_store",
      appName: "NovaPay: Global Send & Save",
      packageId: "com.novapay.wallet",
      publisher: "NovaPay Global Inc",
      storeUrl: "https://play.google.com/store/apps/details?id=com.novapay.wallet",
      sourceType: "fixture",
      retrievedAt: new Date().toISOString(),
    };

    const result = analyzeAppCandidate(candidate, "NovaPay", officialAssets, "NovaPay Global Inc");
    assert.equal(result.isThreat, false);
    assert.equal(result.isExcludedOfficial, true);
    assert.equal(result.riskScore, 0);
  });

  it("FLAGS rogue APK with package ID spoof and seed phrase harvest description", () => {
    const candidate = {
      store: "play_store",
      appName: "NovaPay Instant Wallet Recovery",
      packageId: "com.novapay.wallet.rogue",
      publisher: "Fraudster Studio",
      storeUrl: "https://play.google.com/store/apps/details?id=com.novapay.wallet.rogue",
      description: "Enter seed phrase and private key for instant activation.",
      sourceType: "fixture",
      retrievedAt: new Date().toISOString(),
    };

    const result = analyzeAppCandidate(candidate, "NovaPay", officialAssets, "NovaPay Global Inc");
    assert.equal(result.isThreat, true);
    assert.equal(result.isExcludedOfficial, false);
    assert.ok(result.riskScore >= 70);
    assert.ok(result.matchTypes.includes("package_id_spoof"));
    assert.ok(result.matchTypes.includes("publisher_mismatch"));
  });
});
