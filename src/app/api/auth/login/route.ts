
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  verifyPassword,
  signSession,
  SESSION_COOKIE_NAME,
  checkRateLimit,
  logSecurityEvent,
  logAudit,
  getActiveAuthRepository,
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
    const normalizedEmail = email.toLowerCase().trim();

    // Use the configured repository: Supabase or SQLite.
    const repo = getActiveAuthRepository();
    const user = await repo.getUserByEmail(normalizedEmail);

    let isValid = false;

    if (user) {
      isValid = verifyPassword(password, user.password_hash, user.salt);
    } else {
      // Dummy verification to reduce timing differences.
      verifyPassword(password, "00".repeat(64), "00".repeat(16));
    }

    if (!user || !isValid) {
      await logSecurityEvent({
        eventType: "failed_login",
        email: normalizedEmail,
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

    if (user.role !== "admin" && user.role !== "owner") {
      return NextResponse.json(
        { error: "Unauthorized role." },
        { status: 403 }
      );
    }

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

    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: sessionToken,
      httpOnly: true,
      secure:
        process.env.COOKIE_SECURE === "true" ||
        (process.env.NODE_ENV === "production" &&
          req.nextUrl.protocol === "https:"),
      sameSite: "lax",
      path: "/",
      maxAge: 86400 * 7,
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);

    return NextResponse.json(
      { error: "Internal server error. Please try again later." },
      { status: 500 }
    );
  }
}
