import crypto from "node:crypto";
import {
  getRepository,
  type DatabaseRepository,
  type UserRecord,
  type OwnerOrganizationContext,
  type AuditLogParams,
  type SecurityEventParams,
} from "./repository.ts";

const SESSION_SECRET = process.env.SESSION_SECRET || "kampus_hackathon_super_secure_session_secret_2026";
export const SESSION_COOKIE_NAME = "kampus_session";

export interface UserSession {
  userId: string;
  email: string;
  role: "admin" | "owner";
  fullName: string;
  organizationId?: string;
  organizationName?: string;
  organizationSlug?: string;
  verificationStatus?: string;
}

/**
 * Explicit error representing an unexpected database failure during authentication.
 * Distinguishes database outages from missing users or invalid credentials.
 */
export class AuthDatabaseError extends Error {
  readonly cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = "AuthDatabaseError";
    this.cause = cause;
  }
}

/**
 * Resolves the active DatabaseRepository for authentication operations.
 * Defaults to SQLite for local development and existing test suites.
 * Set AUTH_DATA_STORE=supabase or DATA_STORE=supabase to select Supabase.
 */
export function getActiveAuthRepository(): DatabaseRepository {
  const store = (
    process.env.AUTH_DATA_STORE ||
    process.env.DATA_STORE ||
    "sqlite"
  )
    .toLowerCase()
    .trim();

  if (store === "supabase") {
    return getRepository("supabase");
  }
  return getRepository("sqlite");
}

// Cryptographic password hashing using scrypt
export function hashPassword(password: string): { hash: string; salt: string } {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return { hash, salt };
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  try {
    const derived = crypto.scryptSync(password, salt, 64);
    const stored = Buffer.from(hash, "hex");
    if (derived.length !== stored.length) return false;
    return crypto.timingSafeEqual(derived, stored);
  } catch {
    return false;
  }
}

// HMAC-signed session token
export function signSession(payload: object): string {
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto.createHmac("sha256", SESSION_SECRET).update(data).digest("base64url");
  return `${data}.${signature}`;
}

export function verifySessionToken<T>(token: string): T | null {
  try {
    const [data, signature] = token.split(".");
    if (!data || !signature) return null;
    const expected = crypto.createHmac("sha256", SESSION_SECRET).update(data).digest("base64url");
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
      return null;
    }
    const json = Buffer.from(data, "base64url").toString("utf-8");
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

// In-memory rate limiting for auth endpoints (5 attempts per minute)
const loginAttempts = new Map<string, { count: number; firstAttempt: number }>();

export function checkRateLimit(key: string, maxAttempts = 5, windowMs = 60_000): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = loginAttempts.get(key);

  if (!entry || now - entry.firstAttempt > windowMs) {
    loginAttempts.set(key, { count: 1, firstAttempt: now });
    return { allowed: true, remaining: maxAttempts - 1 };
  }

  if (entry.count >= maxAttempts) {
    return { allowed: false, remaining: 0 };
  }

  entry.count += 1;
  return { allowed: true, remaining: maxAttempts - entry.count };
}

// Audit logger delegating to active repository
export async function logAudit(params: {
  id?: string;
  actorId?: string | null;
  actorRole?: string | null;
  action: string;
  resource_type?: string;
  resourceType: string;
  resourceId?: string | null;
  metadata?: Record<string, any>;
  createdAt?: string;
}): Promise<void> {
  const repo = getActiveAuthRepository();
  await repo.logAudit({
    id: params.id,
    actorId: params.actorId || null,
    actorRole: params.actorRole || null,
    action: params.action,
    resourceType: params.resourceType || params.resource_type || "system",
    resourceId: params.resourceId || null,
    metadata: params.metadata || {},
    createdAt: params.createdAt,
  });
}

// Security event logger delegating to active repository
export async function logSecurityEvent(params: {
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
}): Promise<void> {
  const repo = getActiveAuthRepository();
  await repo.logSecurityEvent(params);
}

/**
 * Validates a signed session token and retrieves the corresponding UserSession
 * using the repository abstraction.
 *
 * Enforces:
 * 1. HMAC token signature verification
 * 2. User lookup via DatabaseRepository
 * 3. Strict application role validation ('admin' or 'owner')
 * 4. Owner organization context retrieval for owners
 * 5. Explicit error handling for database failures (never treated as missing users)
 */
export async function getUserSessionFromToken(
  token: string,
  customRepo?: DatabaseRepository
): Promise<UserSession | null> {
  const payload = verifySessionToken<{ userId: string; email: string; role: string }>(token);
  if (!payload || !payload.userId) {
    return null;
  }

  const repo = customRepo || getActiveAuthRepository();

  let user: UserRecord | null;
  try {
    user = await repo.getUserById(payload.userId);
  } catch (err: any) {
    throw new AuthDatabaseError(
      `Database error retrieving user during session verification: ${err.message}`,
      err
    );
  }

  if (!user) {
    return null;
  }

  if (user.role !== "admin" && user.role !== "owner") {
    throw new Error(
      `Unauthorized application role: '${user.role}'. Only 'admin' and 'owner' are permitted.`
    );
  }

  let orgInfo: Partial<OwnerOrganizationContext> = {};

  if (user.role === "owner") {
    let context: OwnerOrganizationContext | null = null;
    try {
      context = await repo.getOwnerContextByUserId(user.id);
    } catch (err: any) {
      throw new AuthDatabaseError(
        `Database error retrieving owner organization context: ${err.message}`,
        err
      );
    }

    if (context) {
      orgInfo = {
        organizationId: context.organizationId,
        organizationName: context.organizationName,
        organizationSlug: context.organizationSlug,
        verificationStatus: context.verificationStatus,
      };
    }
  }

  return {
    userId: user.id,
    email: user.email,
    role: user.role,
    fullName: user.full_name,
    organizationId: orgInfo.organizationId,
    organizationName: orgInfo.organizationName,
    organizationSlug: orgInfo.organizationSlug,
    verificationStatus: orgInfo.verificationStatus,
  };
}

// Retrieve current session from server-side cookies
export async function getCurrentUser(customRepo?: DatabaseRepository): Promise<UserSession | null> {
  try {
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);
    if (!sessionCookie || !sessionCookie.value) return null;

    return await getUserSessionFromToken(sessionCookie.value, customRepo);
  } catch (err) {
    if (err instanceof AuthDatabaseError) {
      throw err;
    }
    return null;
  }
}
