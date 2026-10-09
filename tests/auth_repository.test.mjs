import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import {
  signSession,
  verifySessionToken,
  getUserSessionFromToken,
  getActiveAuthRepository,
  AuthDatabaseError,
  logAudit,
  logSecurityEvent,
} from "../src/lib/auth.ts";
import {
  SqliteDatabaseRepository,
  SupabaseDatabaseRepository,
} from "../src/lib/repository.ts";
import { getDb, autoSeed } from "../src/lib/db.ts";
import { createClient } from "@supabase/supabase-js";

describe("Authentication & Session Repository Migration", () => {
  before(() => {
    const db = getDb();
    const userCount = db.prepare("SELECT COUNT(*) as count FROM users").get();
    if (userCount.count === 0) {
      autoSeed(db);
    }
  });

  it("resolves valid admin session using the default repository", async () => {
    const token = signSession({
      userId: "usr_admin_01",
      email: "admin@kampus.vc",
      role: "admin",
    });

    const session = await getUserSessionFromToken(token);
    assert.ok(session, "Session must be resolved");
    assert.equal(session.userId, "usr_admin_01");
    assert.equal(session.email, "admin@kampus.vc");
    assert.equal(session.role, "admin");
    assert.equal(session.fullName, "Kampus Security Administrator");
    assert.equal(session.organizationId, undefined, "Admin must not have organizationId attached");
  });

  it("resolves valid owner session with joined owner organization context", async () => {
    const token = signSession({
      userId: "usr_owner_novapay",
      email: "owner@novapay.io",
      role: "owner",
    });

    const session = await getUserSessionFromToken(token);
    assert.ok(session, "Session must be resolved");
    assert.equal(session.userId, "usr_owner_novapay");
    assert.equal(session.email, "owner@novapay.io");
    assert.equal(session.role, "owner");
    assert.equal(session.fullName, "Alex Vance (NovaPay VP Security)");
    assert.equal(session.organizationId, "org_novapay_01");
    assert.equal(session.organizationName, "NovaPay Global");
    assert.equal(session.organizationSlug, "novapay");
    assert.equal(session.verificationStatus, "verified");
  });

  it("rejects session token with tampered HMAC signature", async () => {
    const validToken = signSession({
      userId: "usr_admin_01",
      email: "admin@kampus.vc",
      role: "admin",
    });

    const [data, sig] = validToken.split(".");
    const tamperedToken = `${data}.${sig.slice(0, -4)}XXXX`;

    const session = await getUserSessionFromToken(tamperedToken);
    assert.equal(session, null, "Tampered signature must return null");
  });

  it("rejects malformed session token", async () => {
    assert.equal(await getUserSessionFromToken(""), null);
    assert.equal(await getUserSessionFromToken("invalid-token-no-dot"), null);
    assert.equal(await getUserSessionFromToken("not_json.fake_signature"), null);
  });

  it("returns null when session token user does not exist in repository", async () => {
    const token = signSession({
      userId: "usr_non_existent_999",
      email: "ghost@kampus.vc",
      role: "owner",
    });

    const session = await getUserSessionFromToken(token);
    assert.equal(session, null, "Missing user in repository must return null session");
  });

  it("enforces strict role validation (rejects unauthorized roles)", async () => {
    const fakeRepo = {
      async getUserById(id) {
        return {
          id,
          email: "analyst@kampus.vc",
          password_hash: "hash",
          salt: "salt",
          role: "analyst", // Invalid application role
          full_name: "Analyst User",
          is_verified: 1,
          created_at: "2026-01-01T00:00:00Z",
          updated_at: "2026-01-01T00:00:00Z",
        };
      },
      async getOwnerContextByUserId() {
        return null;
      },
    };

    const token = signSession({
      userId: "usr_analyst_01",
      email: "analyst@kampus.vc",
      role: "analyst",
    });

    await assert.rejects(
      async () => getUserSessionFromToken(token, fakeRepo),
      /Unauthorized application role: 'analyst'/
    );
  });

  it("explicitly raises AuthDatabaseError on database failure during user lookup", async () => {
    const failingRepo = {
      async getUserById() {
        throw new Error("PostgreSQL connection timeout: server closed connection");
      },
      async getOwnerContextByUserId() {
        return null;
      },
    };

    const token = signSession({
      userId: "usr_admin_01",
      email: "admin@kampus.vc",
      role: "admin",
    });

    await assert.rejects(
      async () => getUserSessionFromToken(token, failingRepo),
      (err) => {
        assert.ok(err instanceof AuthDatabaseError, "Must be an AuthDatabaseError instance");
        assert.match(err.message, /Database error retrieving user during session verification/);
        return true;
      }
    );
  });

  it("explicitly raises AuthDatabaseError on database failure during owner context lookup", async () => {
    const failingContextRepo = {
      async getUserById(id) {
        return {
          id,
          email: "owner@novapay.io",
          password_hash: "hash",
          salt: "salt",
          role: "owner",
          full_name: "Owner User",
          is_verified: 1,
          created_at: "2026-01-01T00:00:00Z",
          updated_at: "2026-01-01T00:00:00Z",
        };
      },
      async getOwnerContextByUserId() {
        throw new Error("Database deadlocked on membership query");
      },
    };

    const token = signSession({
      userId: "usr_owner_novapay",
      email: "owner@novapay.io",
      role: "owner",
    });

    await assert.rejects(
      async () => getUserSessionFromToken(token, failingContextRepo),
      (err) => {
        assert.ok(err instanceof AuthDatabaseError, "Must be an AuthDatabaseError instance");
        assert.match(err.message, /Database error retrieving owner organization context/);
        return true;
      }
    );
  });

  it("getActiveAuthRepository defaults to SQLite repository", () => {
    delete process.env.AUTH_DATA_STORE;
    delete process.env.DATA_STORE;

    const repo = getActiveAuthRepository();
    assert.ok(repo instanceof SqliteDatabaseRepository, "Default repository must be SQLite");
  });

  it("getActiveAuthRepository selects Supabase when AUTH_DATA_STORE=supabase is configured", () => {
    process.env.AUTH_DATA_STORE = "supabase";
    try {
      const repo = getActiveAuthRepository();
      assert.ok(repo instanceof SupabaseDatabaseRepository, "Configured repository must be Supabase");
    } finally {
      delete process.env.AUTH_DATA_STORE;
    }
  });

  it("routes logAudit and logSecurityEvent through the active repository with secret redaction", async () => {
    await assert.doesNotReject(async () => {
      await logAudit({
        actorId: "usr_admin_01",
        actorRole: "admin",
        action: "auth_test.ping",
        resourceType: "system",
        metadata: {
          test: "active",
          secretPassword: "unredactedPassword",
        },
      });
    });

    await assert.doesNotReject(async () => {
      await logSecurityEvent({
        eventType: "failed_login",
        email: "probe@attack.net",
        severity: "medium",
        details: { attemptedPassword: "cleartextPassword" },
      });
    });
  });

  it("verifies Supabase tables remain empty (0 rows) after all authentication tests", async (t) => {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SECRET_KEY;

    if (!url || !key) {
      t.skip("Supabase env vars not set; skipping zero-row check.");
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
