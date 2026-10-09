import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { getDb, autoSeed } from "../src/lib/db.ts";

describe("Database Relational Schema & Persistence Constraints", () => {
  const db = getDb();

  before(() => {
    const userCount = db.prepare("SELECT COUNT(*) as count FROM users").get();
    if (userCount.count === 0) {
      autoSeed(db);
    }
  });

  it("enforces foreign keys and pragma settings", () => {
    const fkPragma = db.prepare("PRAGMA foreign_keys").get();
    assert.equal(fkPragma.foreign_keys, 1, "Foreign keys must be active");
  });

  it("persists users with strictly 'admin' or 'owner' role", () => {
    const admin = db.prepare("SELECT email, role FROM users WHERE email = ?").get("admin@kampus.vc");
    assert.ok(admin);
    assert.equal(admin.role, "admin");

    const owner = db.prepare("SELECT email, role FROM users WHERE email = ?").get("owner@novapay.io");
    assert.ok(owner);
    assert.equal(owner.role, "owner");

    // Attempting invalid role must throw constraint error
    assert.throws(() => {
      db.prepare(`
        INSERT INTO users (id, email, password_hash, salt, role, full_name, created_at, updated_at)
        VALUES ('test_bad_role', 'bad@role.com', 'h', 's', 'analyst', 'Bad User', 'now', 'now')
      `).run();
    }, /CHECK constraint failed/);
  });

  it("persists brand profiles linked to organizations with foreign key constraints", () => {
    const org = db.prepare("SELECT id, name FROM organizations WHERE slug = ?").get("novapay");
    assert.ok(org);

    const bp = db.prepare("SELECT id, brand_name, primary_domain FROM brand_profiles WHERE organization_id = ?").get(org.id);
    assert.ok(bp);
    assert.equal(bp.brand_name, "NovaPay");
    assert.equal(bp.primary_domain, "novapay.io");
  });

  it("enforces tenant-isolation: non-existent organization foreign key rejected", () => {
    assert.throws(() => {
      db.prepare(`
        INSERT INTO brand_profiles (id, organization_id, brand_name, industry, description, primary_domain, verification_token, dns_txt_record, created_at, updated_at)
        VALUES ('bp_fake', 'org_does_not_exist', 'Fake', 'None', 'None', 'fake.com', 't', 'r', 'now', 'now')
      `).run();
    }, /FOREIGN KEY constraint failed/);
  });
});
