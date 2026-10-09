import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
import crypto from "node:crypto";
import {
  getRepository,
  SupabaseDatabaseRepository,
} from "../src/lib/repository.ts";
import { createClient } from "@supabase/supabase-js";

// Replicate RegisterSchema from /api/auth/register
const RegisterSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.string().email("Valid email required"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must include at least one uppercase letter")
    .regex(/[0-9]/, "Password must include at least one number"),
  organizationName: z.string().min(2, "Organization name must be at least 2 characters"),
  brandName: z.string().min(2, "Brand name must be at least 2 characters"),
  industry: z.string().min(2, "Industry is required"),
  primaryDomain: z
    .string()
    .min(3, "Domain is required")
    .regex(/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, "Must be a valid domain (e.g. brand.com)"),
  logoUrl: z
    .string({ required_error: "Brand logo URL is required" })
    .min(1, "Brand logo URL is required")
    .url("Must be a valid URL")
    .refine((url) => url.startsWith("https://"), {
      message: "Brand logo URL must be a secure HTTPS address (e.g. https://brand.com/logo.png)",
    }),
  description: z.string().min(10, "Please provide a brief brand description (min 10 chars)"),
});

describe("Brand Logo URL Registration & Validation Tests", () => {
  const baseValidPayload = {
    fullName: "Security Lead",
    email: "security@testbrand.com",
    password: "Password123!",
    organizationName: "Test Brand Corp",
    brandName: "TestBrand",
    industry: "Financial Technology",
    primaryDomain: "testbrand.com",
    description: "Legitimate enterprise financial services provider.",
  };

  it("rejects registration payload when logoUrl is missing", () => {
    const payload = { ...baseValidPayload };
    const parsed = RegisterSchema.safeParse(payload);
    assert.equal(parsed.success, false);
    const issue = parsed.error.issues.find((i) => i.path.includes("logoUrl"));
    assert.ok(issue, "Expected a validation error for missing logoUrl");
  });

  it("rejects registration payload when logoUrl is empty string", () => {
    const payload = { ...baseValidPayload, logoUrl: "" };
    const parsed = RegisterSchema.safeParse(payload);
    assert.equal(parsed.success, false);
    const issue = parsed.error.issues.find((i) => i.path.includes("logoUrl"));
    assert.ok(issue, "Expected a validation error for empty logoUrl");
  });

  it("rejects registration payload when logoUrl is not a valid URL format", () => {
    const payload = { ...baseValidPayload, logoUrl: "not-a-valid-url" };
    const parsed = RegisterSchema.safeParse(payload);
    assert.equal(parsed.success, false);
    const issue = parsed.error.issues.find((i) => i.path.includes("logoUrl"));
    assert.ok(issue, "Expected a validation error for malformed logoUrl");
    assert.match(issue.message, /Must be a valid URL/i);
  });

  it("rejects registration payload when logoUrl uses insecure http:// protocol", () => {
    const payload = { ...baseValidPayload, logoUrl: "http://insecure-cdn.com/logo.png" };
    const parsed = RegisterSchema.safeParse(payload);
    assert.equal(parsed.success, false);
    const issue = parsed.error.issues.find((i) => i.path.includes("logoUrl"));
    assert.ok(issue, "Expected a validation error for non-HTTPS logoUrl");
    assert.match(issue.message, /secure HTTPS address/i);
  });

  it("accepts registration payload when logoUrl is a valid HTTPS address", () => {
    const payload = { ...baseValidPayload, logoUrl: "https://cdn.brand.com/assets/logo.png" };
    const parsed = RegisterSchema.safeParse(payload);
    assert.equal(parsed.success, true);
    assert.equal(parsed.data.logoUrl, "https://cdn.brand.com/assets/logo.png");
  });

  it("persists logo_url in brand_profiles using SQLite repository provider", async () => {
    const repo = getRepository("sqlite");
    const testSuffix = crypto.randomUUID().slice(0, 6);
    const testEmail = `lead-${testSuffix}@logotest.com`;
    const expectedLogoUrl = "https://static.brandprotect.io/logos/brand-shield-main.svg";

    const regResult = await repo.registerOrganization({
      email: testEmail,
      passwordHash: "dummy_hash",
      salt: "dummy_salt",
      fullName: "Logo Verification User",
      organizationName: `Logo Test Org ${testSuffix}`,
      brandName: `LogoBrand ${testSuffix}`,
      industry: "Financial Technology",
      primaryDomain: `logotest-${testSuffix}.com`,
      logoUrl: expectedLogoUrl,
      description: "Automated test organization for brand logo URL persistence.",
    });

    assert.ok(regResult.organizationId, "Should return registered organization ID");
    assert.ok(regResult.brandProfileId, "Should return registered brand profile ID");

    // Fetch the brand profile using the repository abstraction
    const bp = await repo.getBrandProfileByOrganizationId(regResult.organizationId);
    assert.ok(bp, "Brand profile must exist");
    assert.equal(bp.logo_url, expectedLogoUrl, "brand_profiles.logo_url must match persisted URL");
  });

  it("persists logo_url in brand_profiles using Supabase repository provider double", async () => {
    let capturedBrandProfilePayload = null;

    const mockClient = {
      from(table) {
        return {
          insert(payload) {
            if (table === "brand_profiles") {
              capturedBrandProfilePayload = payload;
            }
            return Promise.resolve({ data: null, error: null });
          },
          select() {
            return {
              eq() {
                return {
                  maybeSingle() {
                    return Promise.resolve({ data: null, error: null });
                  },
                };
              },
            };
          },
        };
      },
    };

    const supabaseRepo = new SupabaseDatabaseRepository(mockClient);
    const expectedLogoUrl = "https://cdn.enterprise.org/media/corporate-logo.png";

    const result = await supabaseRepo.registerOrganization({
      email: "owner@supabasedouble.com",
      passwordHash: "hash_test",
      salt: "salt_test",
      fullName: "Supabase Double Owner",
      organizationName: "Supabase Double Corp",
      brandName: "SupabaseDoubleBrand",
      industry: "SaaS & Cloud Services",
      primaryDomain: "supabasedouble.com",
      logoUrl: expectedLogoUrl,
      description: "Verification of brand logo URL persistence to Supabase brand_profiles.",
    });

    assert.ok(result.organizationId, "Should return organization ID");
    assert.ok(capturedBrandProfilePayload, "Should have called insert on brand_profiles");
    assert.equal(
      capturedBrandProfilePayload.logo_url,
      expectedLogoUrl,
      "Supabase brand_profiles insert must include the logo_url"
    );
  });

  it("verifies live Supabase tables remain completely empty (0 rows)", async (t) => {
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
