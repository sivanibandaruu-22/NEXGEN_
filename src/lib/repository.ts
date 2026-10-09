import crypto from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getDb } from "./db.ts";
import { extractSocialEntries, normalizeSocialAsset } from "./detection/social.ts";

/**
 * Core entity records representing database rows.
 * These typed interfaces reflect the relational models in both SQLite and Supabase PostgreSQL.
 */
export interface UserRecord {
  id: string;
  email: string;
  password_hash: string;
  salt: string;
  role: "admin" | "owner";
  full_name: string;
  is_verified: number;
  created_at: string;
  updated_at: string;
}

export interface OrganizationRecord {
  id: string;
  name: string;
  slug: string;
  verification_status: "submitted" | "pending_verification" | "verified" | "rejected" | "needs_info";
  verification_reason: string | null;
  verified_by: string | null;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrganizationMembershipRecord {
  id: string;
  user_id: string;
  organization_id: string;
  role: string;
  created_at: string;
}

export interface OwnerOrganizationContext {
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  verificationStatus: string;
}

export interface BrandProfileRecord {
  id: string;
  organization_id: string;
  brand_name: string;
  industry: string;
  description: string;
  logo_url: string | null;
  primary_domain: string;
  verification_token: string;
  dns_txt_record: string;
  domain_verified: number;
  created_at: string;
  updated_at: string;
}

export interface OfficialAssetRecord {
  id: string;
  brand_profile_id: string;
  asset_type: "domain" | "social" | "app" | "alias";
  platform: string;
  identifier: string;
  url: string | null;
  is_verified: number;
  created_at: string;
}

export interface OrganizationWithDetails {
  id: string;
  name: string;
  slug: string;
  verificationStatus: string;
  verificationReason: string | null;
  verifiedBy: string | null;
  verifiedAt: string | null;
  createdAt: string;
  owner: { id: string; email: string; fullName: string } | null;
  brandProfile: {
    id: string;
    brandName: string;
    industry: string;
    description: string;
    primaryDomain: string;
    domainVerified: boolean;
    dnsTxtRecord: string;
    logoUrl?: string | null;
  } | null;
  assets: OfficialAssetRecord[];
}

export interface RegisterSocialHandles {
  twitter?: string | null;
  instagram?: string | null;
  facebook?: string | null;
  linkedin?: string | null;
  youtube?: string | null;
}

export interface RegisterOrganizationParams {
  userId?: string;
  email: string;
  passwordHash: string;
  salt: string;
  fullName: string;
  organizationName: string;
  brandName: string;
  industry: string;
  primaryDomain: string;
  logoUrl: string;
  description: string;
  socialHandles?: RegisterSocialHandles | Array<{ platform: string; identifier: string; url?: string | null }>;
}

export interface RegisterOrganizationResult {
  userId: string;
  organizationId: string;
  organizationSlug: string;
  brandProfileId: string;
}

export interface AdminDecisionParams {
  organizationId: string;
  decision: "approve" | "reject" | "needs_info";
  reason: string;
  reviewerId: string;
}

export interface AdminDecisionResult {
  newStatus: "verified" | "rejected" | "needs_info";
  organizationName: string;
}

export interface UpdateBrandProfileParams {
  brandName: string;
  industry: string;
  description: string;
  logoUrl?: string | null;
  primaryDomain: string;
}

export interface CreateOfficialAssetParams {
  brandProfileId: string;
  assetType: "domain" | "social" | "app" | "alias";
  platform: string;
  identifier: string;
  url?: string | null;
  isVerified?: number;
}

export interface SubmitChallengeParams {
  organizationId: string;
  ownerUserId: string;
  organizationName: string;
  primaryDomain: string;
}

export interface AuditLogParams {
  id?: string;
  actorId?: string | null;
  actorRole?: string | null;
  action: string;
  resource_type?: string;
  resourceType: string;
  resourceId?: string | null;
  metadata?: Record<string, any>;
  createdAt?: string;
}

export interface SecurityEventParams {
  id?: string;
  eventType:
    | "failed_login"
    | "rate_limit_exceeded"
    | "suspicious_attempt"
    | "unauthorized_access"
    | "session_invalidated"
    | "password_reset_attempt"
    | string;
  email?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  severity: "low" | "medium" | "high" | "critical";
  details?: Record<string, any>;
  createdAt?: string;
}

/**
 * Server-only database repository interface.
 * Decouples application logic from the underlying persistence provider (SQLite vs Supabase PostgreSQL).
 */
export interface DatabaseRepository {
  // User lookup operations
  getUserById(id: string): Promise<UserRecord | null>;
  getUserByEmail(email: string): Promise<UserRecord | null>;

  // Organization operations
  registerOrganization(params: RegisterOrganizationParams): Promise<RegisterOrganizationResult>;
  getOrganizationById(id: string): Promise<OrganizationRecord | null>;
  getOrganizationBySlug(slug: string): Promise<OrganizationRecord | null>;
  getAllOrganizationsWithDetails(): Promise<OrganizationWithDetails[]>;
  recordAdminOrganizationDecision(params: AdminDecisionParams): Promise<AdminDecisionResult>;

  // Organization membership & owner context
  getMembershipByUserId(userId: string): Promise<OrganizationMembershipRecord | null>;
  getOwnerContextByUserId(userId: string): Promise<OwnerOrganizationContext | null>;

  // Brand profile operations
  getBrandProfileByOrganizationId(organizationId: string): Promise<BrandProfileRecord | null>;
  updateBrandProfile(organizationId: string, params: UpdateBrandProfileParams): Promise<BrandProfileRecord | null>;
  submitVerificationChallenge(params: SubmitChallengeParams): Promise<void>;

  // Official assets operations
  getAssetsByBrandProfileId(brandProfileId: string): Promise<OfficialAssetRecord[]>;
  getAssetByBrandProfileAndIdentifier(
    brandProfileId: string,
    identifier: string,
    assetType: string
  ): Promise<OfficialAssetRecord | null>;
  createOfficialAsset(params: CreateOfficialAssetParams): Promise<OfficialAssetRecord>;
  deleteOfficialAsset(assetId: string, brandProfileId: string): Promise<boolean>;

  // Immutable security & audit logging
  logAudit(params: AuditLogParams): Promise<void>;
  logSecurityEvent(params: SecurityEventParams): Promise<void>;
}

/**
 * Local SQLite implementation of the DatabaseRepository.
 * Uses node:sqlite DatabaseSync singleton while returning Promises for interface conformance.
 */
export class SqliteDatabaseRepository implements DatabaseRepository {
  async getUserById(id: string): Promise<UserRecord | null> {
    const db = getDb();
    const row = db
      .prepare(
        `SELECT id, email, password_hash, salt, role, full_name, is_verified, created_at, updated_at
         FROM users
         WHERE id = ?`
      )
      .get(id) as UserRecord | undefined;
    return row || null;
  }

  async getUserByEmail(email: string): Promise<UserRecord | null> {
    const db = getDb();
    const normalized = email.toLowerCase().trim();
    const row = db
      .prepare(
        `SELECT id, email, password_hash, salt, role, full_name, is_verified, created_at, updated_at
         FROM users
         WHERE email = ?`
      )
      .get(normalized) as UserRecord | undefined;
    return row || null;
  }

  async registerOrganization(params: RegisterOrganizationParams): Promise<RegisterOrganizationResult> {
    const db = getDb();
    const normalizedEmail = params.email.toLowerCase().trim();
    const normalizedDomain = params.primaryDomain.toLowerCase().trim();

    const slug = params.organizationName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    const existingSlug = db.prepare("SELECT id FROM organizations WHERE slug = ?").get(slug);
    const finalSlug = existingSlug ? `${slug}-${Math.floor(1000 + Math.random() * 9000)}` : slug;

    const now = new Date().toISOString();
    const userId = params.userId || "usr_" + crypto.randomUUID().slice(0, 8);
    const orgId = "org_" + crypto.randomUUID().slice(0, 8);
    const brandId = "bp_" + crypto.randomUUID().slice(0, 8);
    const verifyToken = "kampus-verify-" + crypto.randomBytes(8).toString("hex");
    const dnsTxtRecord = `kampus-site-verification=${verifyToken}`;

    db.exec("BEGIN TRANSACTION;");
    try {
      // 1. Insert User
      db.prepare(`
        INSERT INTO users (id, email, password_hash, salt, role, full_name, is_verified, created_at, updated_at)
        VALUES (?, ?, ?, ?, 'owner', ?, 1, ?, ?)
      `).run(userId, normalizedEmail, params.passwordHash, params.salt, params.fullName, now, now);

      // 2. Insert Organization
      db.prepare(`
        INSERT INTO organizations (id, name, slug, verification_status, created_at, updated_at)
        VALUES (?, ?, ?, 'submitted', ?, ?)
      `).run(orgId, params.organizationName, finalSlug, now, now);

      // 3. Insert Membership
      db.prepare(`
        INSERT INTO organization_memberships (id, user_id, organization_id, role, created_at)
        VALUES (?, ?, ?, 'owner', ?)
      `).run("mem_" + crypto.randomUUID().slice(0, 8), userId, orgId, now);

      // 4. Insert Brand Profile (persisting logo_url)
      db.prepare(`
        INSERT INTO brand_profiles (id, organization_id, brand_name, industry, description, logo_url, primary_domain, verification_token, dns_txt_record, domain_verified, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
      `).run(brandId, orgId, params.brandName, params.industry, params.description, params.logoUrl, normalizedDomain, verifyToken, dnsTxtRecord, now, now);

      // 5. Insert Primary Domain as first Official Asset
      db.prepare(`
        INSERT INTO official_assets (id, brand_profile_id, asset_type, platform, identifier, url, is_verified, created_at)
        VALUES (?, ?, 'domain', 'web', ?, ?, 0, ?)
      `).run("asset_" + crypto.randomUUID().slice(0, 8), brandId, normalizedDomain, `https://${normalizedDomain}`, now);

      // 5b. Insert Official Social Assets if provided
      const socialEntries = extractSocialEntries(params.socialHandles);
      for (const entry of socialEntries) {
        db.prepare(`
          INSERT INTO official_assets (id, brand_profile_id, asset_type, platform, identifier, url, is_verified, created_at)
          VALUES (?, ?, 'social', ?, ?, ?, 1, ?)
        `).run(
          "asset_" + crypto.randomUUID().slice(0, 8),
          brandId,
          entry.platform,
          entry.identifier,
          entry.url || null,
          now
        );
      }

      // 6. In-App Notification
      db.prepare(`
        INSERT INTO notifications (id, user_id, organization_id, title, message, link, read_status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, 0, ?)
      `).run(
        "notif_" + crypto.randomUUID().slice(0, 8),
        userId,
        orgId,
        "Brand Profile Submitted for Verification",
        `Your organization ${params.organizationName} has been registered. Add your DNS challenge token to verify domain ownership.`,
        "/owner/brand-profile",
        now
      );

      db.exec("COMMIT;");
      return {
        userId,
        organizationId: orgId,
        organizationSlug: finalSlug,
        brandProfileId: brandId,
      };
    } catch (txError) {
      db.exec("ROLLBACK;");
      throw txError;
    }
  }

  async getOrganizationById(id: string): Promise<OrganizationRecord | null> {
    const db = getDb();
    const row = db
      .prepare(
        `SELECT id, name, slug, verification_status, verification_reason, verified_by, verified_at, created_at, updated_at
         FROM organizations
         WHERE id = ?`
      )
      .get(id) as OrganizationRecord | undefined;
    return row || null;
  }

  async getOrganizationBySlug(slug: string): Promise<OrganizationRecord | null> {
    const db = getDb();
    const normalized = slug.toLowerCase().trim();
    const row = db
      .prepare(
        `SELECT id, name, slug, verification_status, verification_reason, verified_by, verified_at, created_at, updated_at
         FROM organizations
         WHERE slug = ?`
      )
      .get(normalized) as OrganizationRecord | undefined;
    return row || null;
  }

  async getAllOrganizationsWithDetails(): Promise<OrganizationWithDetails[]> {
    const db = getDb();
    const orgs = db
      .prepare(
        `SELECT 
          o.id, o.name, o.slug, o.verification_status, o.verification_reason, o.verified_by, o.verified_at, o.created_at,
          bp.id as brand_id, bp.brand_name, bp.industry, bp.description, bp.primary_domain, bp.domain_verified, bp.dns_txt_record, bp.logo_url
        FROM organizations o
        LEFT JOIN brand_profiles bp ON o.id = bp.organization_id
        ORDER BY o.created_at DESC`
      )
      .all() as any[];

    return orgs.map((org) => {
      let assets: OfficialAssetRecord[] = [];
      if (org.brand_id) {
        assets = db
          .prepare(
            `SELECT id, brand_profile_id, asset_type, platform, identifier, url, is_verified, created_at
             FROM official_assets 
             WHERE brand_profile_id = ?
             ORDER BY created_at ASC`
          )
          .all(org.brand_id) as unknown as OfficialAssetRecord[];
      }

      const owner = db
        .prepare(
          `SELECT u.id, u.email, u.full_name
           FROM organization_memberships m
           JOIN users u ON m.user_id = u.id
           WHERE m.organization_id = ?
           LIMIT 1`
        )
        .get(org.id) as { id: string; email: string; full_name: string } | undefined;

      return {
        id: org.id,
        name: org.name,
        slug: org.slug,
        verificationStatus: org.verification_status,
        verificationReason: org.verification_reason || null,
        verifiedBy: org.verified_by || null,
        verifiedAt: org.verified_at || null,
        createdAt: org.created_at,
        owner: owner ? { id: owner.id, email: owner.email, fullName: owner.full_name } : null,
        brandProfile: org.brand_id
          ? {
              id: org.brand_id,
              brandName: org.brand_name,
              industry: org.industry,
              description: org.description,
              primaryDomain: org.primary_domain,
              domainVerified: Boolean(org.domain_verified),
              dnsTxtRecord: org.dns_txt_record,
              logoUrl: org.logo_url || null,
            }
          : null,
        assets,
      };
    });
  }

  async recordAdminOrganizationDecision(params: AdminDecisionParams): Promise<AdminDecisionResult> {
    const db = getDb();
    const org = db
      .prepare("SELECT id, name, verification_status FROM organizations WHERE id = ?")
      .get(params.organizationId) as { id: string; name: string; verification_status: string } | undefined;

    if (!org) {
      throw new Error(`Organization ${params.organizationId} not found`);
    }

    if (params.decision === "approve" && org.verification_status === "verified") {
      throw new Error(`Organization "${org.name}" is already verified. Duplicate approval prevented.`);
    }

    if (params.decision === "reject" && org.verification_status === "rejected") {
      throw new Error(`Organization "${org.name}" is already rejected. Conflicting decision prevented.`);
    }

    const now = new Date().toISOString();
    let newStatus: "verified" | "rejected" | "needs_info";
    if (params.decision === "approve") {
      newStatus = "verified";
    } else if (params.decision === "reject") {
      newStatus = "rejected";
    } else {
      newStatus = "needs_info";
    }

    db.exec("BEGIN TRANSACTION;");
    try {
      db.prepare(
        `UPDATE organizations 
         SET verification_status = ?, verification_reason = ?, verified_by = ?, verified_at = ?, updated_at = ?
         WHERE id = ?`
      ).run(newStatus, params.reason, params.reviewerId, now, now, params.organizationId);

      if (newStatus === "verified") {
        const profile = db
          .prepare("SELECT id FROM brand_profiles WHERE organization_id = ?")
          .get(params.organizationId) as { id: string } | undefined;
        if (profile) {
          db.prepare(`UPDATE brand_profiles SET domain_verified = 1, updated_at = ? WHERE id = ?`).run(now, profile.id);
          db.prepare(`UPDATE official_assets SET is_verified = 1 WHERE brand_profile_id = ?`).run(profile.id);
        }
      }

      const reviewId = "rev_" + crypto.randomUUID().slice(0, 8);
      db.prepare(
        `INSERT INTO admin_reviews (id, target_id, target_type, decision, reason, reviewer_id, created_at)
         VALUES (?, ?, 'organization_verification', ?, ?, ?, ?)`
      ).run(reviewId, params.organizationId, params.decision, params.reason, params.reviewerId, now);

      const membership = db
        .prepare("SELECT user_id FROM organization_memberships WHERE organization_id = ? LIMIT 1")
        .get(params.organizationId) as { user_id: string } | undefined;
      if (membership) {
        const notifTitle =
          newStatus === "verified"
            ? "Organization Profile Officially Verified"
            : newStatus === "rejected"
            ? "Verification Request Rejected"
            : "Additional Information Required for Verification";

        db.prepare(
          `INSERT INTO notifications (id, user_id, organization_id, title, message, link, read_status, created_at)
           VALUES (?, ?, ?, ?, ?, ?, 0, ?)`
        ).run(
          "notif_" + crypto.randomUUID().slice(0, 8),
          membership.user_id,
          params.organizationId,
          notifTitle,
          `Admin decision: "${params.reason}"`,
          "/owner/brand-profile",
          now
        );
      }

      db.exec("COMMIT;");
      return { newStatus, organizationName: org.name };
    } catch (err) {
      db.exec("ROLLBACK;");
      throw err;
    }
  }

  async getMembershipByUserId(userId: string): Promise<OrganizationMembershipRecord | null> {
    const db = getDb();
    const row = db
      .prepare(
        `SELECT id, user_id, organization_id, role, created_at
         FROM organization_memberships
         WHERE user_id = ?
         LIMIT 1`
      )
      .get(userId) as OrganizationMembershipRecord | undefined;
    return row || null;
  }

  async getOwnerContextByUserId(userId: string): Promise<OwnerOrganizationContext | null> {
    const db = getDb();
    const row = db
      .prepare(
        `SELECT o.id, o.name, o.slug, o.verification_status 
         FROM organization_memberships m
         JOIN organizations o ON m.organization_id = o.id
         WHERE m.user_id = ?
         LIMIT 1`
      )
      .get(userId) as
      | { id: string; name: string; slug: string; verification_status: string }
      | undefined;

    if (!row) return null;
    return {
      organizationId: row.id,
      organizationName: row.name,
      organizationSlug: row.slug,
      verificationStatus: row.verification_status,
    };
  }

  async getBrandProfileByOrganizationId(organizationId: string): Promise<BrandProfileRecord | null> {
    const db = getDb();
    const row = db
      .prepare(
        `SELECT id, organization_id, brand_name, industry, description, logo_url, primary_domain, verification_token, dns_txt_record, domain_verified, created_at, updated_at
         FROM brand_profiles
         WHERE organization_id = ?`
      )
      .get(organizationId) as unknown as BrandProfileRecord | undefined;
    return row || null;
  }

  async updateBrandProfile(organizationId: string, params: UpdateBrandProfileParams): Promise<BrandProfileRecord | null> {
    const db = getDb();
    const profile = db
      .prepare("SELECT id FROM brand_profiles WHERE organization_id = ?")
      .get(organizationId) as { id: string } | undefined;
    if (!profile) return null;

    const now = new Date().toISOString();
    db.prepare(
      `UPDATE brand_profiles 
       SET brand_name = ?, industry = ?, description = ?, logo_url = ?, primary_domain = ?, updated_at = ?
       WHERE id = ?`
    ).run(
      params.brandName,
      params.industry,
      params.description,
      params.logoUrl || null,
      params.primaryDomain.toLowerCase().trim(),
      now,
      profile.id
    );

    return this.getBrandProfileByOrganizationId(organizationId);
  }

  async submitVerificationChallenge(params: SubmitChallengeParams): Promise<void> {
    const db = getDb();
    const now = new Date().toISOString();

    db.prepare(
      `UPDATE organizations 
       SET verification_status = 'pending_verification', updated_at = ?
       WHERE id = ?`
    ).run(now, params.organizationId);

    db.prepare(
      `INSERT INTO notifications (id, user_id, organization_id, title, message, link, read_status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 0, ?)`
    ).run(
      "notif_" + crypto.randomUUID().slice(0, 8),
      params.ownerUserId,
      params.organizationId,
      "Verification Request Under Review",
      "Your DNS verification and asset claims have been queued for Kampus Risk Admin validation.",
      "/owner/brand-profile",
      now
    );

    const adminUser = db
      .prepare("SELECT id FROM users WHERE role = 'admin' LIMIT 1")
      .get() as { id: string } | undefined;

    if (adminUser) {
      db.prepare(
        `INSERT INTO notifications (id, user_id, organization_id, title, message, link, read_status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, 0, ?)`
      ).run(
        "notif_" + crypto.randomUUID().slice(0, 8),
        adminUser.id,
        params.organizationId,
        "New Organization Verification Request",
        `Organization "${params.organizationName}" has requested verification for domain "${params.primaryDomain}".`,
        "/admin/organizations",
        now
      );
    }
  }

  async getAssetsByBrandProfileId(brandProfileId: string): Promise<OfficialAssetRecord[]> {
    const db = getDb();
    const rows = db
      .prepare(
        `SELECT id, brand_profile_id, asset_type, platform, identifier, url, is_verified, created_at
         FROM official_assets 
         WHERE brand_profile_id = ?
         ORDER BY created_at ASC`
      )
      .all(brandProfileId) as unknown as OfficialAssetRecord[];
    return rows;
  }

  async getAssetByBrandProfileAndIdentifier(
    brandProfileId: string,
    identifier: string,
    assetType: string
  ): Promise<OfficialAssetRecord | null> {
    const db = getDb();
    const row = db
      .prepare(
        `SELECT id, brand_profile_id, asset_type, platform, identifier, url, is_verified, created_at
         FROM official_assets 
         WHERE brand_profile_id = ? AND identifier = ? AND asset_type = ?`
      )
      .get(brandProfileId, identifier.trim(), assetType) as unknown as OfficialAssetRecord | undefined;
    return row || null;
  }

  async createOfficialAsset(params: CreateOfficialAssetParams): Promise<OfficialAssetRecord> {
    const db = getDb();
    const assetId = "asset_" + crypto.randomUUID().slice(0, 8);
    const now = new Date().toISOString();
    const isAutoVerified = params.assetType === "alias" ? 1 : (params.isVerified ?? 0);

    let finalPlatform = params.platform;
    let finalIdentifier = params.identifier.trim();
    let finalUrl = params.url || null;

    if (params.assetType === "social") {
      const norm = normalizeSocialAsset(params.platform, params.identifier);
      if (norm) {
        finalPlatform = norm.platform;
        finalIdentifier = norm.identifier;
        finalUrl = params.url || norm.url;
      }
    }

    db.prepare(`
      INSERT INTO official_assets (id, brand_profile_id, asset_type, platform, identifier, url, is_verified, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      assetId,
      params.brandProfileId,
      params.assetType,
      finalPlatform,
      finalIdentifier,
      finalUrl,
      isAutoVerified,
      now
    );

    return {
      id: assetId,
      brand_profile_id: params.brandProfileId,
      asset_type: params.assetType,
      platform: finalPlatform,
      identifier: finalIdentifier,
      url: finalUrl,
      is_verified: isAutoVerified,
      created_at: now,
    };
  }

  async deleteOfficialAsset(assetId: string, brandProfileId: string): Promise<boolean> {
    const db = getDb();
    const existing = db
      .prepare("SELECT id FROM official_assets WHERE id = ? AND brand_profile_id = ?")
      .get(assetId, brandProfileId);

    if (!existing) return false;

    db.prepare("DELETE FROM official_assets WHERE id = ?").run(assetId);
    return true;
  }

  async logAudit(params: AuditLogParams): Promise<void> {
    try {
      const db = getDb();
      const id = params.id || "aud_" + crypto.randomUUID();
      const stmt = db.prepare(`
        INSERT INTO audit_logs (id, actor_id, actor_role, action, resource_type, resource_id, metadata_json, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(
        id,
        params.actorId || null,
        params.actorRole || null,
        params.action,
        params.resourceType || params.resource_type || "system",
        params.resourceId || null,
        JSON.stringify(sanitizeLogPayload(params.metadata || {})),
        params.createdAt || new Date().toISOString()
      );
    } catch (err) {
      console.error("Failed to record audit log:", err);
    }
  }

  async logSecurityEvent(params: SecurityEventParams): Promise<void> {
    try {
      const db = getDb();
      const id = params.id || "sec_" + crypto.randomUUID();
      const stmt = db.prepare(`
        INSERT INTO login_security_events (id, event_type, email, ip_address, user_agent, severity, details_json, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(
        id,
        params.eventType,
        params.email || null,
        params.ipAddress || null,
        params.userAgent || null,
        params.severity,
        JSON.stringify(sanitizeLogPayload(params.details || {})),
        params.createdAt || new Date().toISOString()
      );
    } catch (err) {
      console.error("Failed to record security event:", err);
    }
  }
}

/**
 * Recursively sanitizes payloads to ensure sensitive credentials, tokens, and secrets
 * are never persisted into log tables.
 */
export function sanitizeLogPayload(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== "object") return obj;

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeLogPayload(item));
  }

  const sanitized: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    if (
      lowerKey.includes("password") ||
      lowerKey.includes("salt") ||
      lowerKey.includes("secret") ||
      lowerKey.includes("token") ||
      lowerKey.includes("auth") ||
      lowerKey.includes("api_key") ||
      lowerKey.includes("apikey")
    ) {
      sanitized[key] = "[REDACTED]";
    } else if (typeof value === "object" && value !== null) {
      sanitized[key] = sanitizeLogPayload(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

function normalizeUserRecord(data: any): UserRecord {
  if (data.role !== "admin" && data.role !== "owner") {
    throw new Error(`Invalid user role in database: '${data.role}'. Only 'admin' and 'owner' are permitted.`);
  }
  return {
    id: String(data.id),
    email: String(data.email).toLowerCase().trim(),
    password_hash: String(data.password_hash),
    salt: String(data.salt),
    role: data.role as "admin" | "owner",
    full_name: String(data.full_name || ""),
    is_verified: Number(data.is_verified) ? 1 : 0,
    created_at: String(data.created_at),
    updated_at: String(data.updated_at),
  };
}

function normalizeOrganizationRecord(data: any): OrganizationRecord {
  const validStatuses = ["submitted", "pending_verification", "verified", "rejected", "needs_info"];
  const status = validStatuses.includes(data.verification_status)
    ? data.verification_status
    : "submitted";

  return {
    id: String(data.id),
    name: String(data.name),
    slug: String(data.slug).toLowerCase().trim(),
    verification_status: status as OrganizationRecord["verification_status"],
    verification_reason: data.verification_reason != null ? String(data.verification_reason) : null,
    verified_by: data.verified_by != null ? String(data.verified_by) : null,
    verified_at: data.verified_at != null ? String(data.verified_at) : null,
    created_at: String(data.created_at),
    updated_at: String(data.updated_at),
  };
}

function normalizeMembershipRecord(data: any): OrganizationMembershipRecord {
  return {
    id: String(data.id),
    user_id: String(data.user_id),
    organization_id: String(data.organization_id),
    role: String(data.role),
    created_at: String(data.created_at),
  };
}

function normalizeBrandProfile(data: any): BrandProfileRecord {
  return {
    id: String(data.id),
    organization_id: String(data.organization_id),
    brand_name: String(data.brand_name),
    industry: String(data.industry),
    description: String(data.description),
    logo_url: data.logo_url != null ? String(data.logo_url) : null,
    primary_domain: String(data.primary_domain),
    verification_token: String(data.verification_token),
    dns_txt_record: String(data.dns_txt_record),
    domain_verified: Number(data.domain_verified) ? 1 : 0,
    created_at: String(data.created_at),
    updated_at: String(data.updated_at),
  };
}

function normalizeOfficialAsset(data: any): OfficialAssetRecord {
  return {
    id: String(data.id),
    brand_profile_id: String(data.brand_profile_id),
    asset_type: data.asset_type as OfficialAssetRecord["asset_type"],
    platform: String(data.platform),
    identifier: String(data.identifier),
    url: data.url != null ? String(data.url) : null,
    is_verified: Number(data.is_verified) ? 1 : 0,
    created_at: String(data.created_at),
  };
}

/**
 * Supabase PostgreSQL implementation of DatabaseRepository.
 * Uses PostgREST queries via the server-only Supabase client.
 */
export class SupabaseDatabaseRepository implements DatabaseRepository {
  private client?: SupabaseClient;

  constructor(client?: SupabaseClient) {
    if (client) {
      this.client = client;
    }
  }

  protected async getClient(): Promise<SupabaseClient> {
    if (!this.client) {
      const mod = await import("./supabase-server.ts");
      this.client = mod.supabaseServer;
    }
    return this.client;
  }

  async getUserById(id: string): Promise<UserRecord | null> {
    if (!id) return null;
    const client = await this.getClient();
    const { data, error } = await client
      .from("users")
      .select("id, email, password_hash, salt, role, full_name, is_verified, created_at, updated_at")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to retrieve user by ID from Supabase: ${error.message} (code: ${error.code})`);
    }
    if (!data) return null;
    return normalizeUserRecord(data);
  }

  async getUserByEmail(email: string): Promise<UserRecord | null> {
    if (!email) return null;
    const normalized = email.toLowerCase().trim();
    const client = await this.getClient();
    const { data, error } = await client
      .from("users")
      .select("id, email, password_hash, salt, role, full_name, is_verified, created_at, updated_at")
      .eq("email", normalized)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to retrieve user by email from Supabase: ${error.message} (code: ${error.code})`);
    }
    if (!data) return null;
    return normalizeUserRecord(data);
  }

  async registerOrganization(params: RegisterOrganizationParams): Promise<RegisterOrganizationResult> {
    const client = await this.getClient();
    const normalizedEmail = params.email.toLowerCase().trim();
    const normalizedDomain = params.primaryDomain.toLowerCase().trim();

    const slug = params.organizationName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    const existingOrg = await this.getOrganizationBySlug(slug);
    const finalSlug = existingOrg ? `${slug}-${Math.floor(1000 + Math.random() * 9000)}` : slug;

    const now = new Date().toISOString();
    const userId = params.userId || "usr_" + crypto.randomUUID().slice(0, 8);
    const orgId = "org_" + crypto.randomUUID().slice(0, 8);
    const brandId = "bp_" + crypto.randomUUID().slice(0, 8);
    const verifyToken = "kampus-verify-" + crypto.randomBytes(8).toString("hex");
    const dnsTxtRecord = `kampus-site-verification=${verifyToken}`;

    const { error: userErr } = await client.from("users").insert({
      id: userId,
      email: normalizedEmail,
      password_hash: params.passwordHash,
      salt: params.salt,
      role: "owner",
      full_name: params.fullName,
      is_verified: 1,
      created_at: now,
      updated_at: now,
    });
    if (userErr) {
      throw new Error(`Failed to create user in Supabase: ${userErr.message}`);
    }

    const { error: orgErr } = await client.from("organizations").insert({
      id: orgId,
      name: params.organizationName,
      slug: finalSlug,
      verification_status: "submitted",
      created_at: now,
      updated_at: now,
    });
    if (orgErr) {
      throw new Error(`Failed to create organization in Supabase: ${orgErr.message}`);
    }

    const { error: memErr } = await client.from("organization_memberships").insert({
      id: "mem_" + crypto.randomUUID().slice(0, 8),
      user_id: userId,
      organization_id: orgId,
      role: "owner",
      created_at: now,
    });
    if (memErr) {
      throw new Error(`Failed to create membership in Supabase: ${memErr.message}`);
    }

    const { error: bpErr } = await client.from("brand_profiles").insert({
      id: brandId,
      organization_id: orgId,
      brand_name: params.brandName,
      industry: params.industry,
      description: params.description,
      logo_url: params.logoUrl,
      primary_domain: normalizedDomain,
      verification_token: verifyToken,
      dns_txt_record: dnsTxtRecord,
      domain_verified: 0,
      created_at: now,
      updated_at: now,
    });
    if (bpErr) {
      throw new Error(`Failed to create brand profile in Supabase: ${bpErr.message}`);
    }

    const { error: assetErr } = await client.from("official_assets").insert({
      id: "asset_" + crypto.randomUUID().slice(0, 8),
      brand_profile_id: brandId,
      asset_type: "domain",
      platform: "web",
      identifier: normalizedDomain,
      url: `https://${normalizedDomain}`,
      is_verified: 0,
      created_at: now,
    });
    if (assetErr) {
      throw new Error(`Failed to create official asset in Supabase: ${assetErr.message}`);
    }

    // 5b. Insert Official Social Assets if provided
    const socialEntries = extractSocialEntries(params.socialHandles);
    for (const entry of socialEntries) {
      const { error: sErr } = await client.from("official_assets").insert({
        id: "asset_" + crypto.randomUUID().slice(0, 8),
        brand_profile_id: brandId,
        asset_type: "social",
        platform: entry.platform,
        identifier: entry.identifier,
        url: entry.url || null,
        is_verified: 1,
        created_at: now,
      });
      if (sErr) {
        throw new Error(`Failed to create official social asset in Supabase: ${sErr.message}`);
      }
    }

    const { error: notifErr } = await client.from("notifications").insert({
      id: "notif_" + crypto.randomUUID().slice(0, 8),
      user_id: userId,
      organization_id: orgId,
      title: "Brand Profile Submitted for Verification",
      message: `Your organization ${params.organizationName} has been registered. Add your DNS challenge token to verify domain ownership.`,
      link: "/owner/brand-profile",
      read_status: 0,
      created_at: now,
    });
    if (notifErr) {
      throw new Error(`Failed to create notification in Supabase: ${notifErr.message}`);
    }

    return {
      userId,
      organizationId: orgId,
      organizationSlug: finalSlug,
      brandProfileId: brandId,
    };
  }

  async getOrganizationById(id: string): Promise<OrganizationRecord | null> {
    if (!id) return null;
    const client = await this.getClient();
    const { data, error } = await client
      .from("organizations")
      .select("id, name, slug, verification_status, verification_reason, verified_by, verified_at, created_at, updated_at")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to retrieve organization by ID from Supabase: ${error.message} (code: ${error.code})`);
    }
    if (!data) return null;
    return normalizeOrganizationRecord(data);
  }

  async getOrganizationBySlug(slug: string): Promise<OrganizationRecord | null> {
    if (!slug) return null;
    const normalized = slug.toLowerCase().trim();
    const client = await this.getClient();
    const { data, error } = await client
      .from("organizations")
      .select("id, name, slug, verification_status, verification_reason, verified_by, verified_at, created_at, updated_at")
      .eq("slug", normalized)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to retrieve organization by slug from Supabase: ${error.message} (code: ${error.code})`);
    }
    if (!data) return null;
    return normalizeOrganizationRecord(data);
  }

  async getAllOrganizationsWithDetails(): Promise<OrganizationWithDetails[]> {
    const client = await this.getClient();
    const { data, error } = await client
      .from("organizations")
      .select(`
        id, name, slug, verification_status, verification_reason, verified_by, verified_at, created_at,
        brand_profiles (
          id, brand_name, industry, description, primary_domain, domain_verified, dns_txt_record, logo_url,
          official_assets ( id, brand_profile_id, asset_type, platform, identifier, url, is_verified, created_at )
        ),
        organization_memberships (
          role,
          users ( id, email, full_name )
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Failed to retrieve organizations with details from Supabase: ${error.message}`);
    }

    return (data || []).map((org: any) => {
      const bpRaw = org.brand_profiles;
      const bp = Array.isArray(bpRaw) ? bpRaw[0] : bpRaw;
      const assetsRaw = bp?.official_assets || [];
      const assets: OfficialAssetRecord[] = (Array.isArray(assetsRaw) ? assetsRaw : []).map(normalizeOfficialAsset);

      const memRaw = org.organization_memberships;
      const mem = Array.isArray(memRaw) ? memRaw[0] : memRaw;
      const userRaw = mem?.users;
      const user = Array.isArray(userRaw) ? userRaw[0] : userRaw;

      return {
        id: String(org.id),
        name: String(org.name),
        slug: String(org.slug),
        verificationStatus: String(org.verification_status),
        verificationReason: org.verification_reason != null ? String(org.verification_reason) : null,
        verifiedBy: org.verified_by != null ? String(org.verified_by) : null,
        verifiedAt: org.verified_at != null ? String(org.verified_at) : null,
        createdAt: String(org.created_at),
        owner: user ? { id: String(user.id), email: String(user.email), fullName: String(user.full_name) } : null,
        brandProfile: bp
          ? {
              id: String(bp.id),
              brandName: String(bp.brand_name),
              industry: String(bp.industry),
              description: String(bp.description),
              primaryDomain: String(bp.primary_domain),
              domainVerified: Boolean(bp.domain_verified),
              dnsTxtRecord: String(bp.dns_txt_record || ""),
              logoUrl: bp.logo_url != null ? String(bp.logo_url) : null,
            }
          : null,
        assets,
      };
    });
  }

  async recordAdminOrganizationDecision(params: AdminDecisionParams): Promise<AdminDecisionResult> {
    const client = await this.getClient();
    const { data: org, error: orgErr } = await client
      .from("organizations")
      .select("id, name, verification_status")
      .eq("id", params.organizationId)
      .maybeSingle();

    if (orgErr) {
      throw new Error(`Failed to retrieve organization: ${orgErr.message}`);
    }
    if (!org) {
      throw new Error(`Organization ${params.organizationId} not found`);
    }

    if (params.decision === "approve" && org.verification_status === "verified") {
      throw new Error(`Organization "${org.name}" is already verified. Duplicate approval prevented.`);
    }

    if (params.decision === "reject" && org.verification_status === "rejected") {
      throw new Error(`Organization "${org.name}" is already rejected. Conflicting decision prevented.`);
    }

    const now = new Date().toISOString();
    let newStatus: "verified" | "rejected" | "needs_info";
    if (params.decision === "approve") {
      newStatus = "verified";
    } else if (params.decision === "reject") {
      newStatus = "rejected";
    } else {
      newStatus = "needs_info";
    }

    const { error: updateErr } = await client
      .from("organizations")
      .update({
        verification_status: newStatus,
        verification_reason: params.reason,
        verified_by: params.reviewerId,
        verified_at: now,
        updated_at: now,
      })
      .eq("id", params.organizationId);

    if (updateErr) {
      throw new Error(`Failed to update organization verification status: ${updateErr.message}`);
    }

    if (newStatus === "verified") {
      const { data: profile } = await client
        .from("brand_profiles")
        .select("id")
        .eq("organization_id", params.organizationId)
        .maybeSingle();

      if (profile) {
        await client
          .from("brand_profiles")
          .update({ domain_verified: 1, updated_at: now })
          .eq("id", profile.id);

        await client
          .from("official_assets")
          .update({ is_verified: 1 })
          .eq("brand_profile_id", profile.id);
      }
    }

    const reviewId = "rev_" + crypto.randomUUID().slice(0, 8);
    const { error: revErr } = await client.from("admin_reviews").insert({
      id: reviewId,
      target_id: params.organizationId,
      target_type: "organization_verification",
      decision: params.decision,
      reason: params.reason,
      reviewer_id: params.reviewerId,
      created_at: now,
    });
    if (revErr) {
      throw new Error(`Failed to record admin review: ${revErr.message}`);
    }

    const { data: membership } = await client
      .from("organization_memberships")
      .select("user_id")
      .eq("organization_id", params.organizationId)
      .limit(1)
      .maybeSingle();

    if (membership) {
      const notifTitle =
        newStatus === "verified"
          ? "Organization Profile Officially Verified"
          : newStatus === "rejected"
          ? "Verification Request Rejected"
          : "Additional Information Required for Verification";

      await client.from("notifications").insert({
        id: "notif_" + crypto.randomUUID().slice(0, 8),
        user_id: membership.user_id,
        organization_id: params.organizationId,
        title: notifTitle,
        message: `Admin decision: "${params.reason}"`,
        link: "/owner/brand-profile",
        read_status: 0,
        created_at: now,
      });
    }

    return { newStatus, organizationName: org.name };
  }

  async getMembershipByUserId(userId: string): Promise<OrganizationMembershipRecord | null> {
    if (!userId) return null;
    const client = await this.getClient();
    const { data, error } = await client
      .from("organization_memberships")
      .select("id, user_id, organization_id, role, created_at")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to retrieve organization membership from Supabase: ${error.message} (code: ${error.code})`);
    }
    if (!data) return null;
    return normalizeMembershipRecord(data);
  }

  async getOwnerContextByUserId(userId: string): Promise<OwnerOrganizationContext | null> {
    if (!userId) return null;
    const client = await this.getClient();
    const { data, error } = await client
      .from("organization_memberships")
      .select("role, organization_id, organizations(id, name, slug, verification_status)")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to retrieve owner organization context from Supabase: ${error.message} (code: ${error.code})`);
    }
    if (!data) return null;

    const orgRaw = data.organizations;
    const org = Array.isArray(orgRaw) ? orgRaw[0] : orgRaw;

    if (!org || typeof org !== "object" || !org.id) {
      return null;
    }

    return {
      organizationId: String(org.id),
      organizationName: String(org.name),
      organizationSlug: String(org.slug),
      verificationStatus: String(org.verification_status),
    };
  }

  async getBrandProfileByOrganizationId(organizationId: string): Promise<BrandProfileRecord | null> {
    if (!organizationId) return null;
    const client = await this.getClient();
    const { data, error } = await client
      .from("brand_profiles")
      .select("id, organization_id, brand_name, industry, description, logo_url, primary_domain, verification_token, dns_txt_record, domain_verified, created_at, updated_at")
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to retrieve brand profile from Supabase: ${error.message}`);
    }
    if (!data) return null;
    return normalizeBrandProfile(data);
  }

  async updateBrandProfile(organizationId: string, params: UpdateBrandProfileParams): Promise<BrandProfileRecord | null> {
    const client = await this.getClient();
    const now = new Date().toISOString();

    const { data, error } = await client
      .from("brand_profiles")
      .update({
        brand_name: params.brandName,
        industry: params.industry,
        description: params.description,
        logo_url: params.logoUrl || null,
        primary_domain: params.primaryDomain.toLowerCase().trim(),
        updated_at: now,
      })
      .eq("organization_id", organizationId)
      .select()
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to update brand profile in Supabase: ${error.message}`);
    }
    if (!data) return null;
    return normalizeBrandProfile(data);
  }

  async submitVerificationChallenge(params: SubmitChallengeParams): Promise<void> {
    const client = await this.getClient();
    const now = new Date().toISOString();

    const { error: orgErr } = await client
      .from("organizations")
      .update({ verification_status: "pending_verification", updated_at: now })
      .eq("id", params.organizationId);

    if (orgErr) {
      throw new Error(`Failed to update organization status in Supabase: ${orgErr.message}`);
    }

    await client.from("notifications").insert({
      id: "notif_" + crypto.randomUUID().slice(0, 8),
      user_id: params.ownerUserId,
      organization_id: params.organizationId,
      title: "Verification Request Under Review",
      message: "Your DNS verification and asset claims have been queued for Kampus Risk Admin validation.",
      link: "/owner/brand-profile",
      read_status: 0,
      created_at: now,
    });

    const { data: adminUser } = await client
      .from("users")
      .select("id")
      .eq("role", "admin")
      .limit(1)
      .maybeSingle();

    if (adminUser) {
      await client.from("notifications").insert({
        id: "notif_" + crypto.randomUUID().slice(0, 8),
        user_id: adminUser.id,
        organization_id: params.organizationId,
        title: "New Organization Verification Request",
        message: `Organization "${params.organizationName}" has requested verification for domain "${params.primaryDomain}".`,
        link: "/admin/organizations",
        read_status: 0,
        created_at: now,
      });
    }
  }

  async getAssetsByBrandProfileId(brandProfileId: string): Promise<OfficialAssetRecord[]> {
    if (!brandProfileId) return [];
    const client = await this.getClient();
    const { data, error } = await client
      .from("official_assets")
      .select("id, brand_profile_id, asset_type, platform, identifier, url, is_verified, created_at")
      .eq("brand_profile_id", brandProfileId)
      .order("created_at", { ascending: true });

    if (error) {
      throw new Error(`Failed to retrieve official assets from Supabase: ${error.message}`);
    }
    return (data || []).map(normalizeOfficialAsset);
  }

  async getAssetByBrandProfileAndIdentifier(
    brandProfileId: string,
    identifier: string,
    assetType: string
  ): Promise<OfficialAssetRecord | null> {
    const client = await this.getClient();
    const { data, error } = await client
      .from("official_assets")
      .select("id, brand_profile_id, asset_type, platform, identifier, url, is_verified, created_at")
      .eq("brand_profile_id", brandProfileId)
      .eq("identifier", identifier.trim())
      .eq("asset_type", assetType)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to lookup official asset in Supabase: ${error.message}`);
    }
    if (!data) return null;
    return normalizeOfficialAsset(data);
  }

  async createOfficialAsset(params: CreateOfficialAssetParams): Promise<OfficialAssetRecord> {
    const client = await this.getClient();
    const assetId = "asset_" + crypto.randomUUID().slice(0, 8);
    const now = new Date().toISOString();
    const isAutoVerified = params.assetType === "alias" ? 1 : (params.isVerified ?? 0);

    let finalPlatform = params.platform;
    let finalIdentifier = params.identifier.trim();
    let finalUrl = params.url || null;

    if (params.assetType === "social") {
      const norm = normalizeSocialAsset(params.platform, params.identifier);
      if (norm) {
        finalPlatform = norm.platform;
        finalIdentifier = norm.identifier;
        finalUrl = params.url || norm.url;
      }
    }

    const row = {
      id: assetId,
      brand_profile_id: params.brandProfileId,
      asset_type: params.assetType,
      platform: finalPlatform,
      identifier: finalIdentifier,
      url: finalUrl,
      is_verified: isAutoVerified,
      created_at: now,
    };

    const { data, error } = await client
      .from("official_assets")
      .insert(row)
      .select()
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to create official asset in Supabase: ${error.message}`);
    }
    return normalizeOfficialAsset(data || row);
  }

  async deleteOfficialAsset(assetId: string, brandProfileId: string): Promise<boolean> {
    const client = await this.getClient();
    const { data: existing, error: checkErr } = await client
      .from("official_assets")
      .select("id")
      .eq("id", assetId)
      .eq("brand_profile_id", brandProfileId)
      .maybeSingle();

    if (checkErr) {
      throw new Error(`Failed to verify asset ownership in Supabase: ${checkErr.message}`);
    }
    if (!existing) return false;

    const { error: delErr } = await client
      .from("official_assets")
      .delete()
      .eq("id", assetId)
      .eq("brand_profile_id", brandProfileId);

    if (delErr) {
      throw new Error(`Failed to delete official asset in Supabase: ${delErr.message}`);
    }
    return true;
  }

  async logAudit(params: AuditLogParams): Promise<void> {
    const client = await this.getClient();
    const id = params.id || "aud_" + crypto.randomUUID();
    const sanitizedMetadata = sanitizeLogPayload(params.metadata || {});

    const row = {
      id,
      actor_id: params.actorId || null,
      actor_role: params.actorRole || null,
      action: params.action,
      resource_type: params.resourceType || params.resource_type || "system",
      resource_id: params.resourceId || null,
      metadata_json: JSON.stringify(sanitizedMetadata),
      created_at: params.createdAt || new Date().toISOString(),
    };

    const { error } = await client.from("audit_logs").insert(row);

    if (error) {
      throw new Error(`Failed to record audit log in Supabase: ${error.message} (code: ${error.code})`);
    }
  }

  async logSecurityEvent(params: SecurityEventParams): Promise<void> {
    const client = await this.getClient();
    const id = params.id || "sec_" + crypto.randomUUID();
    const sanitizedDetails = sanitizeLogPayload(params.details || {});

    const row = {
      id,
      event_type: params.eventType,
      email: params.email ? params.email.toLowerCase().trim() : null,
      ip_address: params.ipAddress || null,
      user_agent: params.userAgent || null,
      severity: params.severity,
      details_json: JSON.stringify(sanitizedDetails),
      created_at: params.createdAt || new Date().toISOString(),
    };

    const { error } = await client.from("login_security_events").insert(row);

    if (error) {
      throw new Error(`Failed to record security event in Supabase: ${error.message} (code: ${error.code})`);
    }
  }
}

// Singleton instances
let _sqliteRepository: DatabaseRepository | null = null;
let _supabaseRepository: DatabaseRepository | null = null;

/**
 * Factory accessor for the Supabase repository.
 */
export function getSupabaseRepository(client?: SupabaseClient): SupabaseDatabaseRepository {
  if (client) {
    return new SupabaseDatabaseRepository(client);
  }
  if (!_supabaseRepository) {
    _supabaseRepository = new SupabaseDatabaseRepository();
  }
  return _supabaseRepository as SupabaseDatabaseRepository;
}

/**
 * Accessor for the active repository implementation.
 * Defaults to SQLite for local development and existing tests.
 * Supabase provider is available on-demand via getRepository("supabase").
 */
export function getRepository(provider?: "sqlite" | "supabase"): DatabaseRepository {
  if (provider === "supabase") {
    return getSupabaseRepository();
  }
  if (!_sqliteRepository) {
    _sqliteRepository = new SqliteDatabaseRepository();
  }
  return _sqliteRepository;
}

/**
 * Resolves the active DatabaseRepository based on configuration.
 * Defaults to SQLite; selects Supabase if DATA_STORE=supabase or AUTH_DATA_STORE=supabase.
 */
export function getActiveRepository(): DatabaseRepository {
  const store = (
    process.env.DATA_STORE ||
    process.env.AUTH_DATA_STORE ||
    "sqlite"
  )
    .toLowerCase()
    .trim();

  if (store === "supabase") {
    return getRepository("supabase");
  }
  return getRepository("sqlite");
}
