import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

// Ensure data directory exists
const DATA_DIR = path.join(process.cwd(), "data");
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, "kampus.db");

// Singleton connection
let _db: DatabaseSync | null = null;

export function getDb(): DatabaseSync {
  if (!_db) {
    _db = new DatabaseSync(DB_PATH);
    // Performance & integrity pragmas
    _db.exec("PRAGMA journal_mode = WAL;");
    _db.exec("PRAGMA busy_timeout = 5000;");
    _db.exec("PRAGMA foreign_keys = ON;");
    _db.exec("PRAGMA synchronous = NORMAL;");
    runMigrations(_db);
  }
  return _db;
}

function runMigrations(db: DatabaseSync) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'owner')),
      full_name TEXT NOT NULL,
      is_verified INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS organizations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      verification_status TEXT NOT NULL DEFAULT 'submitted' CHECK(verification_status IN ('submitted', 'pending_verification', 'verified', 'rejected', 'needs_info')),
      verification_reason TEXT,
      verified_by TEXT,
      verified_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS organization_memberships (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      role TEXT NOT NULL DEFAULT 'owner',
      created_at TEXT NOT NULL,
      UNIQUE(user_id, organization_id)
    );

    CREATE TABLE IF NOT EXISTS brand_profiles (
      id TEXT PRIMARY KEY,
      organization_id TEXT UNIQUE NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      brand_name TEXT NOT NULL,
      industry TEXT NOT NULL,
      description TEXT NOT NULL,
      logo_url TEXT,
      primary_domain TEXT NOT NULL,
      verification_token TEXT NOT NULL,
      dns_txt_record TEXT NOT NULL,
      domain_verified INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS official_assets (
      id TEXT PRIMARY KEY,
      brand_profile_id TEXT NOT NULL REFERENCES brand_profiles(id) ON DELETE CASCADE,
      asset_type TEXT NOT NULL CHECK(asset_type IN ('domain', 'social', 'app', 'alias')),
      platform TEXT,
      identifier TEXT NOT NULL,
      url TEXT,
      is_verified INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS investigation_jobs (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      status TEXT NOT NULL CHECK(status IN ('pending_approval', 'approved', 'running', 'completed', 'partial_success', 'failed', 'rejected')),
      scope TEXT NOT NULL,
      requested_by TEXT NOT NULL,
      records_analyzed INTEGER NOT NULL DEFAULT 0,
      sources_run_json TEXT NOT NULL DEFAULT '[]',
      stages_json TEXT NOT NULL DEFAULT '[]',
      error_log TEXT,
      started_at TEXT,
      completed_at TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS collected_records (
      id TEXT PRIMARY KEY,
      job_id TEXT NOT NULL REFERENCES investigation_jobs(id) ON DELETE CASCADE,
      platform TEXT NOT NULL,
      source_type TEXT NOT NULL CHECK(source_type IN ('live', 'manual', 'cached', 'fixture')),
      raw_data_json TEXT NOT NULL,
      retrieved_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS detection_findings (
      id TEXT PRIMARY KEY,
      job_id TEXT NOT NULL REFERENCES investigation_jobs(id) ON DELETE CASCADE,
      category TEXT NOT NULL CHECK(category IN ('social', 'app_store', 'lookalike')),
      platform TEXT NOT NULL,
      target_name TEXT NOT NULL,
      target_url TEXT,
      target_identifier TEXT,
      publisher_or_author TEXT,
      matched_brand TEXT NOT NULL,
      risk_score INTEGER NOT NULL,
      confidence TEXT NOT NULL CHECK(confidence IN ('low', 'medium', 'high')),
      match_types_json TEXT NOT NULL,
      evidence_json TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'dismissed', 'false_positive')),
      dismissed_reason TEXT,
      dismissed_by TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS admin_reviews (
      id TEXT PRIMARY KEY,
      target_id TEXT NOT NULL,
      target_type TEXT NOT NULL CHECK(target_type IN ('organization_verification', 'finding', 'report')),
      decision TEXT NOT NULL CHECK(decision IN ('approve', 'reject', 'false_positive', 'needs_info')),
      reason TEXT NOT NULL,
      reviewer_id TEXT NOT NULL REFERENCES users(id),
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY,
      job_id TEXT NOT NULL REFERENCES investigation_jobs(id) ON DELETE CASCADE,
      organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      summary TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'approved', 'shared')),
      findings_summary_json TEXT NOT NULL,
      shared_at TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS report_shares (
      id TEXT PRIMARY KEY,
      report_id TEXT NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
      shared_with_organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      shared_by_user_id TEXT NOT NULL REFERENCES users(id),
      access_token TEXT UNIQUE NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      organization_id TEXT REFERENCES organizations(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      link TEXT,
      read_status INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS login_security_events (
      id TEXT PRIMARY KEY,
      event_type TEXT NOT NULL,
      email TEXT,
      ip_address TEXT,
      user_agent TEXT,
      severity TEXT NOT NULL CHECK(severity IN ('low', 'medium', 'high', 'critical')),
      details_json TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      actor_id TEXT,
      actor_role TEXT,
      action TEXT NOT NULL,
      resource_type TEXT NOT NULL,
      resource_id TEXT,
      metadata_json TEXT,
      created_at TEXT NOT NULL
    );

    -- Performance and foreign-key indexes
    CREATE INDEX IF NOT EXISTS idx_memberships_user ON organization_memberships(user_id);
    CREATE INDEX IF NOT EXISTS idx_memberships_org ON organization_memberships(organization_id);
    CREATE INDEX IF NOT EXISTS idx_assets_brand ON official_assets(brand_profile_id);
    CREATE INDEX IF NOT EXISTS idx_jobs_org ON investigation_jobs(organization_id);
    CREATE INDEX IF NOT EXISTS idx_findings_job ON detection_findings(job_id);
    CREATE INDEX IF NOT EXISTS idx_findings_status ON detection_findings(status);
    CREATE INDEX IF NOT EXISTS idx_reports_org ON reports(organization_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_org ON notifications(organization_id);
    CREATE INDEX IF NOT EXISTS idx_security_events_type ON login_security_events(event_type);
    CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);
  `);

  // Migration: Ensure stages_json exists on investigation_jobs
  try {
    db.exec("ALTER TABLE investigation_jobs ADD COLUMN stages_json TEXT NOT NULL DEFAULT '[]';");
  } catch {
    // Column already exists
  }

  // Auto-seed only when local SQLite is active and AUTO_SEED is explicitly enabled
  const isSupabase = process.env.DATA_STORE === "supabase";
  const shouldAutoSeed = !isSupabase && (process.env.AUTO_SEED === "true" || process.env.AUTO_SEED === "1");
  if (shouldAutoSeed) {
    const userCount = db.prepare("SELECT COUNT(*) as count FROM users").get() as { count: number };
    if (userCount.count === 0) {
      autoSeed(db);
    }
  }
}

export function autoSeed(db: DatabaseSync) {
  function hash(pw: string) {
    const salt = crypto.randomBytes(16).toString("hex");
    const h = crypto.scryptSync(pw, salt, 64).toString("hex");
    return { hash: h, salt };
  }

  const now = new Date().toISOString();

  // Admin Account
  const adminAuth = hash("AdminPassword2026!");
  const adminId = "usr_admin_01";
  db.prepare(`
    INSERT INTO users (id, email, password_hash, salt, role, full_name, is_verified, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
  `).run(adminId, "admin@kampus.vc", adminAuth.hash, adminAuth.salt, "admin", "Kampus Security Administrator", now, now);

  // NovaPay Organization Owner
  const ownerAuth = hash("OwnerPassword2026!");
  const ownerId = "usr_owner_novapay";
  db.prepare(`
    INSERT INTO users (id, email, password_hash, salt, role, full_name, is_verified, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
  `).run(ownerId, "owner@novapay.io", ownerAuth.hash, ownerAuth.salt, "owner", "Alex Vance (NovaPay VP Security)", now, now);

  const orgId = "org_novapay_01";
  db.prepare(`
    INSERT INTO organizations (id, name, slug, verification_status, verification_reason, verified_by, verified_at, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    orgId,
    "NovaPay Global",
    "novapay",
    "verified",
    "Domain DNS challenge verified & legal entity confirmed via LEI registry",
    adminId,
    now,
    now,
    now
  );

  db.prepare(`
    INSERT INTO organization_memberships (id, user_id, organization_id, role, created_at)
    VALUES (?, ?, ?, 'owner', ?)
  `).run("mem_novapay_01", ownerId, orgId, now);

  const brandId = "bp_novapay_01";
  db.prepare(`
    INSERT INTO brand_profiles (id, organization_id, brand_name, industry, description, logo_url, primary_domain, verification_token, dns_txt_record, domain_verified, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
  `).run(
    brandId,
    orgId,
    "NovaPay",
    "Financial Technology & Digital Banking",
    "Next-generation cross-border payment gateway and consumer mobile wallet.",
    "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&h=200&fit=crop",
    "novapay.io",
    "kampus-verify-novapay-9f82d1",
    "kampus-site-verification=kampus-verify-novapay-9f82d1",
    now,
    now
  );

  // Official Assets for NovaPay
  const assets = [
    { type: "domain", platform: "web", iden: "novapay.io", url: "https://novapay.io", verified: 1 },
    { type: "domain", platform: "web", iden: "app.novapay.io", url: "https://app.novapay.io", verified: 1 },
    { type: "social", platform: "twitter", iden: "@NovaPayOfficial", url: "https://x.com/NovaPayOfficial", verified: 1 },
    { type: "social", platform: "linkedin", iden: "novapay-global", url: "https://linkedin.com/company/novapay-global", verified: 1 },
    { type: "app", platform: "play_store", iden: "com.novapay.wallet", url: "https://play.google.com/store/apps/details?id=com.novapay.wallet", verified: 1 },
    { type: "app", platform: "app_store", iden: "id1594830192", url: "https://apps.apple.com/app/novapay-mobile/id1594830192", verified: 1 },
    { type: "alias", platform: "text", iden: "Nova Pay", url: null, verified: 1 },
    { type: "alias", platform: "text", iden: "NovaPay App", url: null, verified: 1 },
    { type: "alias", platform: "text", iden: "NovaPay Wallet", url: null, verified: 1 },
  ];

  const assetStmt = db.prepare(`
    INSERT INTO official_assets (id, brand_profile_id, asset_type, platform, identifier, url, is_verified, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  assets.forEach((a, idx) => {
    assetStmt.run(`asset_nova_${idx + 1}`, brandId, a.type, a.platform, a.iden, a.url, a.verified, now);
  });

  // Zenith Cloud Systems (Pending verification for Admin review demo)
  const zenithAuth = hash("ZenithPassword2026!");
  const zenithOwnerId = "usr_owner_zenith";
  db.prepare(`
    INSERT INTO users (id, email, password_hash, salt, role, full_name, is_verified, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
  `).run(zenithOwnerId, "owner@zenithcloud.com", zenithAuth.hash, zenithAuth.salt, "owner", "Sarah Chen (Zenith Founder)", now, now);

  const zenithOrgId = "org_zenith_02";
  db.prepare(`
    INSERT INTO organizations (id, name, slug, verification_status, verification_reason, created_at, updated_at)
    VALUES (?, ?, ?, 'pending_verification', 'Awaiting administrative verification of DNS challenge token.', ?, ?)
  `).run(zenithOrgId, "Zenith Cloud Systems", "zenith-cloud", now, now);

  db.prepare(`
    INSERT INTO organization_memberships (id, user_id, organization_id, role, created_at)
    VALUES (?, ?, ?, 'owner', ?)
  `).run("mem_zenith_02", zenithOwnerId, zenithOrgId, now);

  db.prepare(`
    INSERT INTO brand_profiles (id, organization_id, brand_name, industry, description, primary_domain, verification_token, dns_txt_record, domain_verified, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
  `).run(
    "bp_zenith_02",
    zenithOrgId,
    "Zenith Cloud",
    "DevOps & Cloud Infrastructure",
    "Distributed high-availability cloud orchestration platform.",
    "zenithcloud.dev",
    "kampus-verify-zenith-c42b10",
    "kampus-site-verification=kampus-verify-zenith-c42b10",
    now,
    now
  );

  // Security Events Seed
  const secStmt = db.prepare(`
    INSERT INTO login_security_events (id, event_type, email, ip_address, user_agent, severity, details_json, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  secStmt.run(
    "sec_seed_1",
    "failed_login",
    "admin@kampus.vc",
    "198.51.100.42",
    "Mozilla/5.0 (X11; Linux x86_64) Python-urllib/3.10",
    "medium",
    JSON.stringify({ reason: "Invalid credential attempt", trigger: "Brute-force probe detected" }),
    new Date(Date.now() - 3600_000 * 3).toISOString()
  );

  secStmt.run(
    "sec_seed_2",
    "rate_limit_exceeded",
    "attacker@probe.net",
    "203.0.113.195",
    "curl/7.88.1",
    "high",
    JSON.stringify({ reason: "Rate limit breached on /api/auth/login", attempts: 8, windowSeconds: 60 }),
    new Date(Date.now() - 3600_000 * 2).toISOString()
  );

  // Initial Notifications
  db.prepare(`
    INSERT INTO notifications (id, user_id, organization_id, title, message, link, read_status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 0, ?)
  `).run(
    "notif_init_01",
    ownerId,
    orgId,
    "Brand Profile Verified",
    "NovaPay Global brand assets have been officially verified by Kampus Risk Team.",
    "/owner/brand-profile",
    now
  );
}

