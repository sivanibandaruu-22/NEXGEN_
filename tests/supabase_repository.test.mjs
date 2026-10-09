import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  SupabaseDatabaseRepository,
  sanitizeLogPayload,
} from "../src/lib/repository.ts";
import { createClient } from "@supabase/supabase-js";

/**
 * Controlled test double generator for Supabase PostgREST client.
 */
function createMockSupabaseClient(tableHandlers = {}) {
  return {
    from(table) {
      const handler = tableHandlers[table] || {};
      const builder = {
        _table: table,
        _selectCols: "*",
        _filters: {},
        _limit: null,
        select(cols) {
          builder._selectCols = cols;
          return builder;
        },
        eq(col, val) {
          builder._filters[col] = val;
          return builder;
        },
        limit(n) {
          builder._limit = n;
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
      return builder;
    },
  };
}

describe("Supabase Repository Provider — Isolated Unit Tests", () => {
  it("getUserById: successfully normalizes user record", async () => {
    const mockUser = {
      id: "usr_mock_01",
      email: "Admin@Kampus.VC",
      password_hash: "hash_xyz",
      salt: "salt_123",
      role: "admin",
      full_name: "Admin User",
      is_verified: 1,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    };

    const mockClient = createMockSupabaseClient({
      users: {
        maybeSingle: (b) => {
          assert.equal(b._filters.id, "usr_mock_01");
          return { data: mockUser, error: null };
        },
      },
    });

    const repo = new SupabaseDatabaseRepository(mockClient);
    const user = await repo.getUserById("usr_mock_01");

    assert.ok(user);
    assert.equal(user.id, "usr_mock_01");
    assert.equal(user.email, "admin@kampus.vc");
    assert.equal(user.role, "admin");
    assert.equal(user.is_verified, 1);
  });

  it("getUserById: returns null when row does not exist", async () => {
    const mockClient = createMockSupabaseClient({
      users: {
        maybeSingle: () => ({ data: null, error: null }),
      },
    });

    const repo = new SupabaseDatabaseRepository(mockClient);
    const user = await repo.getUserById("usr_non_existent");
    assert.equal(user, null);
  });

  it("getUserById: throws explicit error on database failure", async () => {
    const mockClient = createMockSupabaseClient({
      users: {
        maybeSingle: () => ({
          data: null,
          error: { message: "connection timeout", code: "PGRST000" },
        }),
      },
    });

    const repo = new SupabaseDatabaseRepository(mockClient);
    await assert.rejects(
      async () => repo.getUserById("usr_mock_01"),
      /Failed to retrieve user by ID from Supabase: connection timeout/
    );
  });

  it("getUserById: enforces strict role validation (admin or owner only)", async () => {
    const mockUser = {
      id: "usr_rogue_01",
      email: "rogue@kampus.vc",
      password_hash: "hash",
      salt: "salt",
      role: "analyst", // Invalid role
      full_name: "Rogue User",
      is_verified: 1,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    };

    const mockClient = createMockSupabaseClient({
      users: {
        maybeSingle: () => ({ data: mockUser, error: null }),
      },
    });

    const repo = new SupabaseDatabaseRepository(mockClient);
    await assert.rejects(
      async () => repo.getUserById("usr_rogue_01"),
      /Invalid user role in database: 'analyst'/
    );
  });

  it("getUserByEmail: normalizes query casing and returns user", async () => {
    let queriedEmail = null;
    const mockClient = createMockSupabaseClient({
      users: {
        maybeSingle: (b) => {
          queriedEmail = b._filters.email;
          return {
            data: {
              id: "usr_owner_01",
              email: "owner@novapay.com",
              password_hash: "hash_val",
              salt: "salt_val",
              role: "owner",
              full_name: "Owner User",
              is_verified: 1,
              created_at: "2026-01-01T00:00:00Z",
              updated_at: "2026-01-01T00:00:00Z",
            },
            error: null,
          };
        },
      },
    });

    const repo = new SupabaseDatabaseRepository(mockClient);
    const user = await repo.getUserByEmail(" Owner@NovaPay.COM ");

    assert.equal(queriedEmail, "owner@novapay.com");
    assert.ok(user);
    assert.equal(user.role, "owner");
  });

  it("getOrganizationById and getOrganizationBySlug: retrieves and normalizes organization", async () => {
    const mockOrg = {
      id: "org_novapay_01",
      name: "NovaPay Global",
      slug: "novapay",
      verification_status: "verified",
      verification_reason: "Domain verified",
      verified_by: "usr_admin_01",
      verified_at: "2026-01-01T12:00:00Z",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    };

    const mockClient = createMockSupabaseClient({
      organizations: {
        maybeSingle: (b) => {
          if (b._filters.id === "org_novapay_01" || b._filters.slug === "novapay") {
            return { data: mockOrg, error: null };
          }
          return { data: null, error: null };
        },
      },
    });

    const repo = new SupabaseDatabaseRepository(mockClient);
    const byId = await repo.getOrganizationById("org_novapay_01");
    assert.ok(byId);
    assert.equal(byId.name, "NovaPay Global");
    assert.equal(byId.verification_status, "verified");

    const bySlug = await repo.getOrganizationBySlug("Novapay ");
    assert.ok(bySlug);
    assert.equal(bySlug.id, "org_novapay_01");

    const nonExistent = await repo.getOrganizationBySlug("unknown-slug");
    assert.equal(nonExistent, null);
  });

  it("getMembershipByUserId: retrieves membership record", async () => {
    const mockMembership = {
      id: "mem_01",
      user_id: "usr_owner_01",
      organization_id: "org_01",
      role: "owner",
      created_at: "2026-01-01T00:00:00Z",
    };

    const mockClient = createMockSupabaseClient({
      organization_memberships: {
        maybeSingle: (b) => {
          assert.equal(b._filters.user_id, "usr_owner_01");
          return { data: mockMembership, error: null };
        },
      },
    });

    const repo = new SupabaseDatabaseRepository(mockClient);
    const membership = await repo.getMembershipByUserId("usr_owner_01");

    assert.ok(membership);
    assert.equal(membership.user_id, "usr_owner_01");
    assert.equal(membership.organization_id, "org_01");
    assert.equal(membership.role, "owner");
  });

  it("getOwnerContextByUserId: unpacks joined organization details", async () => {
    const mockJoinData = {
      role: "owner",
      organization_id: "org_zenith_01",
      organizations: {
        id: "org_zenith_01",
        name: "Zenith Cloud",
        slug: "zenith",
        verification_status: "pending_verification",
      },
    };

    const mockClient = createMockSupabaseClient({
      organization_memberships: {
        maybeSingle: (b) => {
          assert.equal(b._filters.user_id, "usr_zenith_owner");
          return { data: mockJoinData, error: null };
        },
      },
    });

    const repo = new SupabaseDatabaseRepository(mockClient);
    const context = await repo.getOwnerContextByUserId("usr_zenith_owner");

    assert.ok(context);
    assert.equal(context.organizationId, "org_zenith_01");
    assert.equal(context.organizationName, "Zenith Cloud");
    assert.equal(context.organizationSlug, "zenith");
    assert.equal(context.verificationStatus, "pending_verification");
  });

  it("getOwnerContextByUserId: returns null if user has no membership or organization is missing", async () => {
    const mockClient = createMockSupabaseClient({
      organization_memberships: {
        maybeSingle: () => ({ data: null, error: null }),
      },
    });

    const repo = new SupabaseDatabaseRepository(mockClient);
    const context = await repo.getOwnerContextByUserId("usr_unlinked");
    assert.equal(context, null);
  });

  it("logAudit: persists record with sanitized metadata and redacts credentials", async () => {
    let capturedRow = null;
    const mockClient = createMockSupabaseClient({
      audit_logs: {
        insert: (row) => {
          capturedRow = row;
          return { data: null, error: null };
        },
      },
    });

    const repo = new SupabaseDatabaseRepository(mockClient);
    await repo.logAudit({
      actorId: "usr_admin_01",
      actorRole: "admin",
      action: "organization.verify",
      resourceType: "organization",
      resourceId: "org_novapay_01",
      metadata: {
        organizationName: "NovaPay",
        secretToken: "top-secret-token",
        userPasswordHash: "secret-hash",
        safeMeta: "safe-value",
      },
    });

    assert.ok(capturedRow);
    assert.equal(capturedRow.actor_id, "usr_admin_01");
    assert.equal(capturedRow.action, "organization.verify");
    const parsedMeta = JSON.parse(capturedRow.metadata_json);
    assert.equal(parsedMeta.organizationName, "NovaPay");
    assert.equal(parsedMeta.secretToken, "[REDACTED]");
    assert.equal(parsedMeta.userPasswordHash, "[REDACTED]");
    assert.equal(parsedMeta.safeMeta, "safe-value");
  });

  it("logAudit: throws explicit error when insertion fails", async () => {
    const mockClient = createMockSupabaseClient({
      audit_logs: {
        insert: () => ({
          data: null,
          error: { message: "permission denied", code: "42501" },
        }),
      },
    });

    const repo = new SupabaseDatabaseRepository(mockClient);
    await assert.rejects(
      async () =>
        repo.logAudit({
          action: "test.fail",
          resourceType: "test",
        }),
      /Failed to record audit log in Supabase: permission denied/
    );
  });

  it("logSecurityEvent: persists security event and throws on failure", async () => {
    let capturedRow = null;
    const mockClient = createMockSupabaseClient({
      login_security_events: {
        insert: (row) => {
          capturedRow = row;
          return { data: null, error: null };
        },
      },
    });

    const repo = new SupabaseDatabaseRepository(mockClient);
    await repo.logSecurityEvent({
      eventType: "failed_login",
      email: "Attacker@Test.Org",
      ipAddress: "192.0.2.1",
      userAgent: "curl/8.0",
      severity: "high",
      details: {
        attemptedPassword: "plain_password_123",
        reason: "invalid_credentials",
      },
    });

    assert.ok(capturedRow);
    assert.equal(capturedRow.event_type, "failed_login");
    assert.equal(capturedRow.email, "attacker@test.org");
    const parsedDetails = JSON.parse(capturedRow.details_json);
    assert.equal(parsedDetails.attemptedPassword, "[REDACTED]");
    assert.equal(parsedDetails.reason, "invalid_credentials");

    // Failure case
    const failingMockClient = createMockSupabaseClient({
      login_security_events: {
        insert: () => ({
          data: null,
          error: { message: "database offline", code: "08006" },
        }),
      },
    });
    const failingRepo = new SupabaseDatabaseRepository(failingMockClient);
    await assert.rejects(
      async () =>
        failingRepo.logSecurityEvent({
          eventType: "suspicious_attempt",
          severity: "critical",
        }),
      /Failed to record security event in Supabase: database offline/
    );
  });

  it("sanitizeLogPayload: redacts secrets recursively across arrays and objects", () => {
    const raw = {
      credentials: {
        password: "secretPassword",
        api_key: "key-12345",
        salt: "salt-abc",
      },
      tokens: ["token_1", "normal_string"],
      safeField: 42,
    };

    const sanitized = sanitizeLogPayload(raw);
    assert.equal(sanitized.credentials.password, "[REDACTED]");
    assert.equal(sanitized.credentials.api_key, "[REDACTED]");
    assert.equal(sanitized.credentials.salt, "[REDACTED]");
    assert.equal(sanitized.safeField, 42);
  });
});

describe("Supabase Production Integrity & Zero-Row Verification", () => {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;

  it("verifies all 14 Supabase tables remain completely empty (0 rows)", async (t) => {
    if (!url || !key) {
      t.skip("SUPABASE_URL or SUPABASE_SECRET_KEY not set; skipping live zero-row check.");
      return;
    }

    const liveClient = createClient(url, key, {
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
      const { count, error } = await liveClient
        .from(table)
        .select("*", { count: "exact", head: true });

      assert.equal(
        error,
        null,
        `Querying table '${table}' failed: ${error?.message}`
      );
      assert.equal(
        count,
        0,
        `Table '${table}' must have 0 rows in Supabase, but found count=${count}`
      );
    }
  });

  it("live read-only repository query returns null without creating rows", async (t) => {
    if (!url || !key) {
      t.skip("SUPABASE_URL or SUPABASE_SECRET_KEY not set; skipping live read check.");
      return;
    }

    const liveClient = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const repo = new SupabaseDatabaseRepository(liveClient);

    const nonExistentUser = await repo.getUserById("usr_non_existent_check");
    assert.equal(nonExistentUser, null);

    const nonExistentOrg = await repo.getOrganizationBySlug("non-existent-org");
    assert.equal(nonExistentOrg, null);

    const nonExistentContext = await repo.getOwnerContextByUserId("usr_non_existent_owner");
    assert.equal(nonExistentContext, null);

    // Verify row count remains 0 in users and organizations
    const { count: userCount } = await liveClient
      .from("users")
      .select("*", { count: "exact", head: true });
    assert.equal(userCount, 0, "Users table must remain at 0 rows");

    const { count: orgCount } = await liveClient
      .from("organizations")
      .select("*", { count: "exact", head: true });
    assert.equal(orgCount, 0, "Organizations table must remain at 0 rows");
  });
});
