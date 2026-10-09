import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import {
  verifyPassword,
  signSession,
  SESSION_COOKIE_NAME,
  checkRateLimit,
  logSecurityEvent,
  logAudit,
} from "@/lib/auth";

export const runtime = "nodejs";

const LoginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";
    const userAgent = req.headers.get("user-agent") || "unknown";

    // 1. Rate Limiting Check (5 attempts / min)
    const rateLimit = checkRateLimit(`login:${ip}`);
    if (!rateLimit.allowed) {
      await logSecurityEvent({
        eventType: "rate_limit_exceeded",
        ipAddress: ip,
        userAgent,
        severity: "high",
        details: { endpoint: "/api/auth/login" },
      });
      return NextResponse.json(
        { error: "Too many login attempts. Please wait 60 seconds before trying again." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const parsed = LoginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const { email, password } = parsed.data;
    const db = getDb();

    // 2. Fetch user
    const stmt = db.prepare(`
      SELECT id, email, password_hash, salt, role, full_name, is_verified 
      FROM users 
      WHERE email = ?
    `);
    const user = stmt.get(email.toLowerCase().trim()) as any;

    // Defend against account enumeration & timing attacks: always perform dummy verify if user not found
    let isValid = false;
    if (user) {
      isValid = verifyPassword(password, user.password_hash, user.salt);
    } else {
      // Dummy constant-time work
      verifyPassword(password, "00".repeat(64), "00".repeat(16));
    }

    if (!user || !isValid) {
      await logSecurityEvent({
        eventType: "failed_login",
        email: email.toLowerCase().trim(),
        ipAddress: ip,
        userAgent,
        severity: "medium",
        details: { reason: "Bad credentials or user not found" },
      });
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    // 3. Issue Session Token
    const sessionToken = signSession({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    await logAudit({
      actorId: user.id,
      actorRole: user.role,
      action: "auth.login_success",
      resourceType: "user",
      resourceId: user.id,
      metadata: { ip, userAgent },
    });

    const redirectPath = user.role === "admin" ? "/admin" : "/owner";

    const response = NextResponse.json({
      success: true,
      role: user.role,
      redirect: redirectPath,
    });

    // 4. Set HttpOnly Secure Session Cookie
    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: sessionToken,
      httpOnly: true,
      secure: process.env.COOKIE_SECURE === "true" || (process.env.NODE_ENV === "production" && req.nextUrl.protocol === "https:"),
      sameSite: "lax",
      path: "/",
      maxAge: 86400 * 7, // 7 days
    });

    return response;
  } catch (error: any) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Internal server error. Please try again later." },
      { status: 500 }
    );
  }
}
