import { describe, it } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import {
  getRepository,
  SupabaseDatabaseRepository,
} from "../src/lib/repository.ts";
import {
  normalizeSocialAsset,
  extractSocialEntries,
  analyzeSocialCandidate,
} from "../src/lib/detection/social.ts";
import { querySocialNetworks } from "../src/lib/adapters/index.ts";
import { createClient } from "@supabase/supabase-js";

describe("Official Social Media Handles Registration, Persistence, and Detection Workflow", () => {
  describe("Handle and URL Normalization", () => {
    it("normalizes Twitter/X handles and URLs", () => {
      const fromHandle = normalizeSocialAsset("twitter", "@AcmeBrand");
      assert.equal(fromHandle?.platform, "twitter");
      assert.equal(fromHandle?.identifier, "@AcmeBrand");
      assert.equal(fromHandle?.url, "https://x.com/AcmeBrand");

      const fromUrl = normalizeSocialAsset("twitter", "https://x.com/AcmeBrand");
      assert.equal(fromUrl?.identifier, "@AcmeBrand");
      assert.equal(fromUrl?.url, "https://x.com/AcmeBrand");

      const fromLegacyUrl = normalizeSocialAsset("x", "https://twitter.com/AcmeBrand");
      assert.equal(fromLegacyUrl?.identifier, "@AcmeBrand");
      assert.equal(fromLegacyUrl?.url, "https://x.com/AcmeBrand");
    });

    it("normalizes Instagram handles and URLs", () => {
      const fromHandle = normalizeSocialAsset("instagram", "acme.official");
      assert.equal(fromHandle?.platform, "instagram");
      assert.equal(fromHandle?.identifier, "@acme.official");
      assert.equal(fromHandle?.url, "https://instagram.com/acme.official");

      const fromUrl = normalizeSocialAsset("instagram", "https://instagram.com/acme.official");
      assert.equal(fromUrl?.identifier, "@acme.official");
      assert.equal(fromUrl?.url, "https://instagram.com/acme.official");
    });

    it("normalizes Facebook pages and URLs", () => {
      const fromHandle = normalizeSocialAsset("facebook", "AcmeCorpOfficial");
      assert.equal(fromHandle?.platform, "facebook");
      assert.equal(fromHandle?.identifier, "AcmeCorpOfficial");
      assert.equal(fromHandle?.url, "https://facebook.com/AcmeCorpOfficial");

      const fromUrl = normalizeSocialAsset("facebook", "https://facebook.com/AcmeCorpOfficial");
      assert.equal(fromUrl?.identifier, "AcmeCorpOfficial");
      assert.equal(fromUrl?.url, "https://facebook.com/AcmeCorpOfficial");
    });

    it("normalizes LinkedIn organizations and URLs", () => {
      const fromHandle = normalizeSocialAsset("linkedin", "acme-corporation");
      assert.equal(fromHandle?.platform, "linkedin");
      assert.equal(fromHandle?.identifier, "acme-corporation");
      assert.equal(fromHandle?.url, "https://linkedin.com/company/acme-corporation");

      const fromUrl = normalizeSocialAsset("linkedin", "https://linkedin.com/company/acme-corporation");
      assert.equal(fromUrl?.identifier, "acme-corporation");
      assert.equal(fromUrl?.url, "https://linkedin.com/company/acme-corporation");
    });

    it("normalizes YouTube channels and URLs", () => {
      const fromHandle = normalizeSocialAsset("youtube", "@AcmeGlobal");
      assert.equal(fromHandle?.platform, "youtube");
      assert.equal(fromHandle?.identifier, "@AcmeGlobal");
      assert.equal(fromHandle?.url, "https://youtube.com/@AcmeGlobal");

      const fromUrl = normalizeSocialAsset("youtube", "https://youtube.com/@AcmeGlobal");
      assert.equal(fromUrl?.identifier, "@AcmeGlobal");
      assert.equal(fromUrl?.url, "https://youtube.com/@AcmeGlobal");
    });

    it("extracts multiple social handles into structured entries while skipping empty entries", () => {
      const entries = extractSocialEntries({
        twitter: "@AcmeHQ",
        instagram: "https://instagram.com/acme_hq",
        facebook: "",
        linkedin: "acme-hq",
        youtube: null,
      });

      assert.equal(entries.length, 3);
      assert.deepEqual(entries.map((e) => e.platform).sort(), ["instagram", "linkedin", "twitter"]);
    });
  });

  describe("Registration Persistence & Refresh Verification", () => {
    it("persists official social media accounts during registration in SQLite repository", async () => {
      const repo = getRepository("sqlite");
      const suffix = crypto.randomUUID().slice(0, 6);
      const email = `owner-social-${suffix}@acme-corp.com`;

      const regResult = await repo.registerOrganization({
        email,
        passwordHash: "hash_pass",
        salt: "salt_val",
        fullName: "Social Org Lead",
        organizationName: `Acme MultiSocial ${suffix}`,
        brandName: `AcmeSocial ${suffix}`,
        industry: "SaaS & Cloud Services",
        primaryDomain: `acmesocial-${suffix}.com`,
        logoUrl: "https://assets.acme.com/logo.png",
        description: "Enterprise software services provider with official social footprint.",
        socialHandles: {
          twitter: `@AcmeSocial_${suffix}`,
          instagram: `https://instagram.com/acmesocial_${suffix}`,
          facebook: `acmesocial_${suffix}`,
          linkedin: `acmesocial-group-${suffix}`,
          youtube: `@AcmeSocial_${suffix}`,
        },
      });

      assert.ok(regResult.organizationId);
      assert.ok(regResult.brandProfileId);

      // Verify immediate persistence
      const assets = await repo.getAssetsByBrandProfileId(regResult.brandProfileId);
      const socialAssets = assets.filter((a) => a.asset_type === "social");
      assert.equal(socialAssets.length, 5, "Expected 5 official social media assets to be saved");

      const platforms = socialAssets.map((a) => a.platform).sort();
      assert.deepEqual(platforms, ["facebook", "instagram", "linkedin", "twitter", "youtube"]);

      // Verify that handles appear after reloading/refreshing from the database
      const reloadedProfile = await repo.getBrandProfileByOrganizationId(regResult.organizationId);
      assert.ok(reloadedProfile);
      const reloadedAssets = await repo.getAssetsByBrandProfileId(reloadedProfile.id);
      const reloadedSocials = reloadedAssets.filter((a) => a.asset_type === "social");
      assert.equal(reloadedSocials.length, 5, "Social assets must persist and appear after reload");

      const twitterAsset = reloadedSocials.find((a) => a.platform === "twitter");
      assert.equal(twitterAsset?.identifier, `@AcmeSocial_${suffix}`);
      assert.equal(twitterAsset?.url, `https://x.com/AcmeSocial_${suffix}`);
      assert.equal(twitterAsset?.is_verified, 1);
    });
  });

  describe("Owner Asset Management & Tenant Isolation", () => {
    it("allows owner to add new handles securely and enforces cross-tenant deletion isolation", async () => {
      const repo = getRepository("sqlite");
      const suffixA = crypto.randomUUID().slice(0, 6);
      const suffixB = crypto.randomUUID().slice(0, 6);

      // Register Organization A
      const orgA = await repo.registerOrganization({
        email: `orgA-${suffixA}@shield.io`,
        passwordHash: "hashA",
        salt: "saltA",
        fullName: "Org A Owner",
        organizationName: `Org A Corp ${suffixA}`,
        brandName: `OrgABrand ${suffixA}`,
        industry: "Financial Technology",
        primaryDomain: `orga-${suffixA}.com`,
        logoUrl: "https://orga.com/logo.png",
        description: "Organization A profile",
      });

      // Register Organization B
      const orgB = await repo.registerOrganization({
        email: `orgB-${suffixB}@shield.io`,
        passwordHash: "hashB",
        salt: "saltB",
        fullName: "Org B Owner",
        organizationName: `Org B Corp ${suffixB}`,
        brandName: `OrgBBrand ${suffixB}`,
        industry: "Financial Technology",
        primaryDomain: `orgb-${suffixB}.com`,
        logoUrl: "https://orgb.com/logo.png",
        description: "Organization B profile",
      });

      // Org A adds an official YouTube handle
      const newAssetA = await repo.createOfficialAsset({
        brandProfileId: orgA.brandProfileId,
        assetType: "social",
        platform: "youtube",
        identifier: `@OrgAOfficial_${suffixA}`,
        url: `https://youtube.com/@OrgAOfficial_${suffixA}`,
      });
      assert.ok(newAssetA.id);

      // Attempt cross-tenant deletion: Org B tries to delete Org A's asset
      const unauthorizedDelete = await repo.deleteOfficialAsset(newAssetA.id, orgB.brandProfileId);
      assert.equal(
        unauthorizedDelete,
        false,
        "Tenant isolation must prevent Org B from deleting Org A's asset"
      );

      // Verify asset still exists for Org A
      const assetsAfterFailedHack = await repo.getAssetsByBrandProfileId(orgA.brandProfileId);
      assert.ok(assetsAfterFailedHack.some((a) => a.id === newAssetA.id));

      // Authorized deletion: Org A deletes its own asset
      const authorizedDelete = await repo.deleteOfficialAsset(newAssetA.id, orgA.brandProfileId);
      assert.equal(authorizedDelete, true, "Org A should successfully delete its own asset");

      // Verify asset is permanently removed after refresh
      const assetsAfterDelete = await repo.getAssetsByBrandProfileId(orgA.brandProfileId);
      assert.equal(
        assetsAfterDelete.some((a) => a.id === newAssetA.id),
        false,
        "Asset must be removed from brand profile after authorized deletion"
      );
    });
  });

  describe("Detection Engine Exclusion Workflow", () => {
    const brandName = "NovaPay";
    const registeredOfficialAssets = [
      { id: "a1", assetType: "social", platform: "twitter", identifier: "@NovaPayOfficial", url: "https://x.com/NovaPayOfficial", isVerified: true },
      { id: "a2", assetType: "social", platform: "instagram", identifier: "@novapay.official", url: "https://instagram.com/novapay.official", isVerified: true },
      { id: "a3", assetType: "social", platform: "facebook", identifier: "NovaPayGlobal", url: "https://facebook.com/NovaPayGlobal", isVerified: true },
      { id: "a4", assetType: "social", platform: "linkedin", identifier: "novapay-enterprise", url: "https://linkedin.com/company/novapay-enterprise", isVerified: true },
      { id: "a5", assetType: "social", platform: "youtube", identifier: "@NovaPayGlobal", url: "https://youtube.com/@NovaPayGlobal", isVerified: true },
    ];

    it("EXCLUDES registered official Twitter account from threats", () => {
      const candidate = {
        platform: "twitter",
        handle: "@NovaPayOfficial",
        displayName: "NovaPay Official",
        profileUrl: "https://x.com/NovaPayOfficial",
        bio: "Official corporate Twitter account.",
        sourceType: "fixture",
        retrievedAt: new Date().toISOString(),
      };

      const result = analyzeSocialCandidate(candidate, brandName, registeredOfficialAssets);
      assert.equal(result.isThreat, false, "Must not be flagged as a threat");
      assert.equal(result.isExcludedOfficial, true, "Must be excluded as official asset");
      assert.equal(result.riskScore, 0);
      assert.match(result.exclusionReason, /Official asset match/i);
    });

    it("EXCLUDES registered official Instagram account from threats", () => {
      const candidate = {
        platform: "instagram",
        handle: "@novapay.official",
        displayName: "NovaPay Official Instagram",
        profileUrl: "https://instagram.com/novapay.official",
        bio: "Verified Instagram presence.",
        sourceType: "fixture",
        retrievedAt: new Date().toISOString(),
      };

      const result = analyzeSocialCandidate(candidate, brandName, registeredOfficialAssets);
      assert.equal(result.isThreat, false);
      assert.equal(result.isExcludedOfficial, true);
      assert.equal(result.riskScore, 0);
    });

    it("EXCLUDES registered official YouTube channel from threats", () => {
      const candidate = {
        platform: "youtube",
        handle: "@NovaPayGlobal",
        displayName: "NovaPay Global Channel",
        profileUrl: "https://youtube.com/@NovaPayGlobal",
        bio: "Official product video updates and demonstrations.",
        sourceType: "fixture",
        retrievedAt: new Date().toISOString(),
      };

      const result = analyzeSocialCandidate(candidate, brandName, registeredOfficialAssets);
      assert.equal(result.isThreat, false);
      assert.equal(result.isExcludedOfficial, true);
      assert.equal(result.riskScore, 0);
    });

    it("FLAGS un-registered look-alike account with phishing bio keywords as a high-risk threat", () => {
      const candidate = {
        platform: "twitter",
        handle: "@N\u043Ev\u0430Pay_HelpDesk", // Homoglyph (Cyrillic 'о')
        displayName: "NovaPay Official Help Desk",
        profileUrl: "https://x.com/NovaPay_HelpDesk",
        bio: "24/7 customer support and wallet recovery. DM for help.",
        outboundUrl: "https://phishing-scam-site.net",
        sourceType: "fixture",
        retrievedAt: new Date().toISOString(),
      };

      const result = analyzeSocialCandidate(candidate, brandName, registeredOfficialAssets);
      assert.equal(result.isThreat, true, "Un-registered homoglyph account must be flagged as threat");
      assert.equal(result.isExcludedOfficial, false);
      assert.ok(result.riskScore >= 75);
      assert.ok(result.matchTypes.includes("phishing_bio_keywords"));
    });

    it("adapter querySocialNetworks generates candidates for all official social assets", async () => {
      const { records } = await querySocialNetworks(brandName, registeredOfficialAssets);
      
      for (const asset of registeredOfficialAssets) {
        const found = records.find(
          (r) =>
            r.identifier.toLowerCase().replace(/^@/, "") ===
            asset.identifier.toLowerCase().replace(/^@/, "")
        );
        assert.ok(
          found,
          `Expected adapter to inject candidate record for official asset ${asset.identifier} (${asset.platform})`
        );
      }
    });
  });

  describe("Supabase Production Zero-Row Integrity", () => {
    it("verifies all 14 Supabase tables remain completely empty (0 rows)", async (t) => {
      const url = process.env.SUPABASE_URL;
      const key = process.env.SUPABASE_SECRET_KEY;

      if (!url || !key) {
        t.skip("Supabase environment variables not configured; skipping live check.");
        return;
      }

      const client = createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false },
      });

      const tables = [
        "users",
        "organizations",
        "organization_memberships",
        "brand_profiles",
        "official_assets",
        "investigation_jobs",
        "collected_records",
        "detection_findings",
        "admin_reviews",
        "reports",
        "report_shares",
        "notifications",
        "login_security_events",
        "audit_logs",
      ];

      for (const table of tables) {
        const { count, error } = await client
          .from(table)
          .select("*", { count: "exact", head: true });

        assert.equal(error, null, `Querying table '${table}' failed: ${error?.message}`);
        assert.equal(count, 0, `Table '${table}' must remain at 0 rows, found count=${count}`);
      }
    });
  });
});
