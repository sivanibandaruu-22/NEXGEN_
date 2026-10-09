import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { getRepository } from "../src/lib/repository.ts";
import { getDb, autoSeed } from "../src/lib/db.ts";

describe("Database Repository Interface & SQLite Provider", () => {
  const repo = getRepository();

  before(() => {
    const db = getDb();
    const userCount = db.prepare("SELECT COUNT(*) as count FROM users").get();
    if (userCount.count === 0) {
      autoSeed(db);
    }
  });

  it("retrieves user by email with normalized casing", async () => {
    const user = await repo.getUserByEmail("Admin@Kampus.VC");
    assert.ok(user, "User must be found");
    assert.equal(user.email, "admin@kampus.vc");
    assert.equal(user.role, "admin");
    assert.ok(user.password_hash);
    assert.ok(user.salt);
  });

  it("returns null for non-existent user email", async () => {
    const nonExistent = await repo.getUserByEmail("ghost@notfound.io");
    assert.equal(nonExistent, null);
  });

  it("retrieves user by ID", async () => {
    const user = await repo.getUserById("usr_admin_01");
    assert.ok(user);
    assert.equal(user.id, "usr_admin_01");
    assert.equal(user.role, "admin");
  });

  it("retrieves organization by ID", async () => {
    const org = await repo.getOrganizationById("org_novapay_01");
    assert.ok(org);
    assert.equal(org.name, "NovaPay Global");
    assert.equal(org.slug, "novapay");
    assert.equal(org.verification_status, "verified");
  });

  it("retrieves organization by slug", async () => {
    const org = await repo.getOrganizationBySlug("Novapay");
    assert.ok(org);
    assert.equal(org.id, "org_novapay_01");
  });

  it("retrieves organization membership by user ID", async () => {
    const membership = await repo.getMembershipByUserId("usr_owner_novapay");
    assert.ok(membership);
    assert.equal(membership.user_id, "usr_owner_novapay");
    assert.equal(membership.organization_id, "org_novapay_01");
    assert.equal(membership.role, "owner");
  });

  it("retrieves owner organization context with joined details", async () => {
    const context = await repo.getOwnerContextByUserId("usr_owner_novapay");
    assert.ok(context);
    assert.equal(context.organizationId, "org_novapay_01");
    assert.equal(context.organizationName, "NovaPay Global");
    assert.equal(context.organizationSlug, "novapay");
    assert.equal(context.verificationStatus, "verified");
  });

  it("returns null owner context for non-owner or unlinked user", async () => {
    const context = await repo.getOwnerContextByUserId("usr_admin_01");
    assert.equal(context, null);
  });

  it("records immutable audit log without throwing", async () => {
    await assert.doesNotReject(async () => {
      await repo.logAudit({
        actorId: "usr_admin_01",
        actorRole: "admin",
        action: "repository_test.ping",
        resourceType: "system",
        metadata: { testRun: true },
      });
    });
  });

  it("records security event without throwing", async () => {
    await assert.doesNotReject(async () => {
      await repo.logSecurityEvent({
        eventType: "failed_login",
        email: "probe@test.net",
        ipAddress: "127.0.0.1",
        severity: "low",
        details: { probe: "repository_unit_test" },
      });
    });
  });
});
