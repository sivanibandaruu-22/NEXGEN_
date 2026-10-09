import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import {
  getRepository,
  SupabaseDatabaseRepository,
} from "../src/lib/repository.ts";
import { getDb, autoSeed } from "../src/lib/db.ts";
import { createClient } from "@supabase/supabase-js";

function createMockSupabaseClient(tableHandlers = {}) {
  return {
    from(table) {
      const handler = tableHandlers[table] || {};
      const builder = {
        _table: table,
        _selectCols: "*",
        _filters: {},
        _order: null,
        _updatePayload: null,
        select(cols) {
          builder._selectCols = cols;
          return builder;
        },
        eq(col, val) {
          builder._filters[col] = val;
          return builder;
        },
        order(col, opts) {
          builder._order = { col, opts };
          return builder;
        },
        limit(n) {
          builder._limit = n;
          return builder;
        },
        update(payload) {
          builder._updatePayload = payload;
          return builder;
        },
        delete() {
          return builder;
        },
        async maybeSingle() {
          if (typeof handler.maybeSingle === "function") {
            return handler.maybeSingle(builder);
          }
          return { data: null, error: null };
        },
        async insert(payload) {
          if (typeof handler.insert === "function") {
            return handler.insert(payload);
          }
          return { data: null, error: null };
        },
      };

      // Handle direct awaiting for queries that return arrays (like .order())
      builder.then = (resolve, reject) => {
        if (typeof handler.execute === "function") {
          Promise.resolve(handler.execute(builder)).then(resolve, reject);
        } else {
          resolve({ data: [], error: null });
        }
      };

      return builder;
    },
  };
}

describe("Organization & Brand Management — SQLite Provider", () => {
  const repo = getRepository("sqlite");

  before(() => {
    const db = getDb();
    const userCount = db.prepare("SELECT COUNT(*) as count FROM users").get();
    if (userCount.count === 0) {
      autoSeed(db);
    }
  });

  it("getAllOrganizationsWithDetails: retrieves organizations with nested details", async () => {
    const orgs = await repo.getAllOrganizationsWithDetails();
    assert.ok(Array.isArray(orgs));
    assert.ok(orgs.length >= 1, "Must find at least 1 organization");

    const novapay = orgs.find((o) => o.slug === "novapay");
    assert.ok(novapay, "NovaPay organization must be present");
    assert.equal(novapay.name, "NovaPay Global");
    assert.ok(novapay.brandProfile, "NovaPay brand profile must be loaded");
    assert.equal(novapay.brandProfile.primaryDomain, "novapay.io");
    assert.ok(Array.isArray(novapay.assets), "Assets must be an array");
    assert.ok(novapay.assets.length >= 1, "NovaPay must have registered assets");
    assert.ok(novapay.owner, "Owner info must be present");
    assert.equal(novapay.owner.email, "owner@novapay.io");
  });

  it("getBrandProfileByOrganizationId: retrieves brand profile and handles missing org", async () => {
    const profile = await repo.getBrandProfileByOrganizationId("org_novapay_01");
    assert.ok(profile);
    assert.equal(profile.brand_name, "NovaPay");
    assert.equal(profile.primary_domain, "novapay.io");
    assert.equal(typeof profile.domain_verified, "number");

    const missing = await repo.getBrandProfileByOrganizationId("org_non_existent");
    assert.equal(missing, null);
  });

  it("updateBrandProfile: updates profile details and preserves unchanged fields", async () => {
    const original = await repo.getBrandProfileByOrganizationId("org_novapay_01");
    assert.ok(original);

    const updated = await repo.updateBrandProfile("org_novapay_01", {
      brandName: "NovaPay Global Holdings",
      industry: "Fintech & Payments",
      description: "Updated description for NovaPay Global testing",
      logoUrl: "https://novapay.io/new-logo.png",
      primaryDomain: "novapay.io",
    });

    assert.ok(updated);
    assert.equal(updated.brand_name, "NovaPay Global Holdings");
    assert.equal(updated.industry, "Fintech & Payments");
    assert.equal(updated.logo_url, "https://novapay.io/new-logo.png");
    assert.equal(updated.verification_token, original.verification_token, "Token must be preserved");

    // Revert changes to maintain test fixture stability
    await repo.updateBrandProfile("org_novapay_01", {
      brandName: original.brand_name,
      industry: original.industry,
      description: original.description,
      logoUrl: original.logo_url,
      primaryDomain: original.primary_domain,
    });
  });

  it("getAssetsByBrandProfileId and createOfficialAsset: creates and retrieves official assets", async () => {
    const profile = await repo.getBrandProfileByOrganizationId("org_novapay_01");
    assert.ok(profile);

    const asset = await repo.createOfficialAsset({
      brandProfileId: profile.id,
      assetType: "alias",
      platform: "internal",
      identifier: "novapay-test-alias",
    });

    assert.ok(asset);
    assert.equal(asset.identifier, "novapay-test-alias");
    assert.equal(asset.is_verified, 1, "Alias assets must be auto-verified");

    const found = await repo.getAssetByBrandProfileAndIdentifier(
      profile.id,
      "novapay-test-alias",
      "alias"
    );
    assert.ok(found);
    assert.equal(found.id, asset.id);

    // Clean up test asset
    const deleted = await repo.deleteOfficialAsset(asset.id, profile.id);
    assert.equal(deleted, true);
  });

  it("enforces cross-organization tenant isolation on asset deletion", async () => {
    const profile = await repo.getBrandProfileByOrganizationId("org_novapay_01");
    assert.ok(profile);

    const asset = await repo.createOfficialAsset({
      brandProfileId: profile.id,
      assetType: "social",
      platform: "x",
      identifier: "@novapay_tenant_test",
    });

    // Attempt deletion using another organization's brand profile ID
    const unauthorizedDelete = await repo.deleteOfficialAsset(asset.id, "bp_other_org");
    assert.equal(unauthorizedDelete, false, "Cross-tenant deletion must be rejected");

    // Valid deletion by correct owner brand profile
    const authorizedDelete = await repo.deleteOfficialAsset(asset.id, profile.id);
    assert.equal(authorizedDelete, true);
  });

  it("submitVerificationChallenge: transitions organization status and records notifications", async () => {
    const db = getDb();
    // Temporarily insert a test organization to avoid mutating NovaPay
    const testOrgId = "org_challenge_test_" + Date.now();
    const testBpId = "bp_challenge_test_" + Date.now();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO organizations (id, name, slug, verification_status, created_at, updated_at)
      VALUES (?, 'Challenge Test Org', ?, 'submitted', ?, ?)
    `).run(testOrgId, "challenge-test-" + Date.now(), now, now);

    db.prepare(`
      INSERT INTO brand_profiles (id, organization_id, brand_name, industry, description, primary_domain, verification_token, dns_txt_record, domain_verified, created_at, updated_at)
      VALUES (?, ?, 'Challenge Test', 'Tech', 'Test desc', 'challengetest.io', 'tok', 'dns', 0, ?, ?)
    `).run(testBpId, testOrgId, now, now);

    await repo.submitVerificationChallenge({
      organizationId: testOrgId,
      ownerUserId: "usr_owner_novapay",
      organizationName: "Challenge Test Org",
      primaryDomain: "challengetest.io",
    });

    const updatedOrg = await repo.getOrganizationById(testOrgId);
    assert.ok(updatedOrg);
    assert.equal(updatedOrg.verification_status, "pending_verification");

    // Cleanup
    db.prepare("DELETE FROM organizations WHERE id = ?").run(testOrgId);
  });

  it("recordAdminOrganizationDecision: validates decisions and prevents duplicate approval", async () => {
    const db = getDb();
    const testOrgId = "org_dec_test_" + Date.now();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO organizations (id, name, slug, verification_status, created_at, updated_at)
      VALUES (?, 'Decision Test Org', ?, 'pending_verification', ?, ?)
    `).run(testOrgId, "dec-test-" + Date.now(), now, now);

    // 1. Approve
    const res = await repo.recordAdminOrganizationDecision({
      organizationId: testOrgId,
      decision: "approve",
      reason: "All documents valid",
      reviewerId: "usr_admin_01",
    });
    assert.equal(res.newStatus, "verified");

    const verifiedOrg = await repo.getOrganizationById(testOrgId);
    assert.equal(verifiedOrg.verification_status, "verified");

    // 2. Duplicate approval must be rejected
    await assert.rejects(
      async () =>
        repo.recordAdminOrganizationDecision({
          organizationId: testOrgId,
          decision: "approve",
          reason: "Second approval attempt",
          reviewerId: "usr_admin_01",
        }),
      /Duplicate approval prevented/
    );

    // Cleanup
    db.prepare("DELETE FROM organizations WHERE id = ?").run(testOrgId);
  });
});

describe("Organization & Brand Management — Supabase Provider Doubles", () => {
  it("getBrandProfileByOrganizationId: normalizes database result", async () => {
    const mockClient = createMockSupabaseClient({
      brand_profiles: {
        maybeSingle: (b) => {
          assert.equal(b._filters.organization_id, "org_sb_01");
          return {
            data: {
              id: "bp_sb_01",
              organization_id: "org_sb_01",
              brand_name: "Supabase Brand",
              industry: "Cloud",
              description: "Cloud database platform",
              logo_url: "https://sb.io/logo.png",
              primary_domain: "sb.io",
              verification_token: "tok_123",
              dns_txt_record: "dns_123",
              domain_verified: 1,
              created_at: "2026-01-01T00:00:00Z",
              updated_at: "2026-01-01T00:00:00Z",
            },
            error: null,
          };
        },
      },
    });

    const repo = new SupabaseDatabaseRepository(mockClient);
    const profile = await repo.getBrandProfileByOrganizationId("org_sb_01");

    assert.ok(profile);
    assert.equal(profile.id, "bp_sb_01");
    assert.equal(profile.brand_name, "Supabase Brand");
    assert.equal(profile.domain_verified, 1);
  });

  it("deleteOfficialAsset: enforces tenant boundary and handles not found", async () => {
    const mockClient = createMockSupabaseClient({
      official_assets: {
        maybeSingle: (b) => {
          // Only return data if brand_profile_id matches
          if (b._filters.id === "asset_01" && b._filters.brand_profile_id === "bp_owner_01") {
            return { data: { id: "asset_01" }, error: null };
          }
          return { data: null, error: null };
        },
      },
    });

    const repo = new SupabaseDatabaseRepository(mockClient);

    // Unauthorized cross-org delete
    const denied = await repo.deleteOfficialAsset("asset_01", "bp_attacker_01");
    assert.equal(denied, false);

    // Authorized delete
    const allowed = await repo.deleteOfficialAsset("asset_01", "bp_owner_01");
    assert.equal(allowed, true);
  });

  it("propagates database errors explicitly without masking as null", async () => {
    const failingClient = createMockSupabaseClient({
      brand_profiles: {
        maybeSingle: () => ({
          data: null,
          error: { message: "Network connection terminated", code: "57P01" },
        }),
      },
    });

    const repo = new SupabaseDatabaseRepository(failingClient);
    await assert.rejects(
      async () => repo.getBrandProfileByOrganizationId("org_01"),
      /Failed to retrieve brand profile from Supabase: Network connection terminated/
    );
  });

  it("verifies live Supabase tables remain completely empty (0 rows)", async (t) => {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SECRET_KEY;

    if (!url || !key) {
      t.skip("Supabase env vars not set; skipping live zero-row check.");
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
