import { getDb } from "./db.ts";
import { hashPassword } from "./auth.ts";

export function seedDatabase() {
  if (process.env.DATA_STORE === "supabase") {
    return { success: false, message: "Automatic seeding is disabled when DATA_STORE=supabase." };
  }

  const db = getDb();

  // Check if already seeded
  const checkAdmin = db.prepare("SELECT id FROM users WHERE email = ?").get("admin@kampus.vc");
  if (checkAdmin) {
    return { success: true, message: "Database already seeded." };
  }

  const now = new Date().toISOString();

  // 1. Seed Admin User
  const adminAuth = hashPassword("AdminPassword2026!");
  const adminId = "usr_admin_01";
  db.prepare(`
    INSERT INTO users (id, email, password_hash, salt, role, full_name, is_verified, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
  `).run(adminId, "admin@kampus.vc", adminAuth.hash, adminAuth.salt, "admin", "Kampus Security Administrator", now, now);

  // 2. Seed Organization Owner: NovaPay Global (Verified)
  const ownerAuth = hashPassword("OwnerPassword2026!");
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

  // 3. Seed Second Org: Zenith Cloud (Pending Verification for Admin Review demo)
  const zenithOwnerAuth = hashPassword("ZenithPassword2026!");
  const zenithOwnerId = "usr_owner_zenith";
  db.prepare(`
    INSERT INTO users (id, email, password_hash, salt, role, full_name, is_verified, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
  `).run(zenithOwnerId, "owner@zenithcloud.com", zenithOwnerAuth.hash, zenithOwnerAuth.salt, "owner", "Sarah Chen (Zenith Founder)", now, now);

  const zenithOrgId = "org_zenith_02";
  db.prepare(`
    INSERT INTO organizations (id, name, slug, verification_status, verification_reason, created_at, updated_at)
    VALUES (?, ?, ?, 'pending_verification', 'Awaiting administrative verification of DNS challenge token.', ?, ?)
  `).run(zenithOrgId, "Zenith Cloud Systems", "zenith-cloud", now, now);

  db.prepare(`
    INSERT INTO organization_memberships (id, user_id, organization_id, role, created_at)
    VALUES (?, ?, ?, 'owner', ?)
  `).run("mem_zenith_02", zenithOwnerId, zenithOrgId, now);

  const zenithBrandId = "bp_zenith_02";
  db.prepare(`
    INSERT INTO brand_profiles (id, organization_id, brand_name, industry, description, primary_domain, verification_token, dns_txt_record, domain_verified, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
  `).run(
    zenithBrandId,
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

  // 4. Seed initial Login Security Threat Events
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

  // 5. Seed initial Notification
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

  return { success: true, message: "Database seeded successfully." };
}

// Allow direct execution: `node --experimental-strip-types src/lib/seed.ts` or via CLI
try {
  if (process.argv[1] && (process.argv[1].endsWith("seed.ts") || process.argv[1].endsWith("seed.js"))) {
    const res = seedDatabase();
    console.log(res);
  }
} catch {
  // Ignored in bundled environments
}
