import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getActiveRepository } from "@/lib/repository";
import {
  hashPassword,
  signSession,
  SESSION_COOKIE_NAME,
  checkRateLimit,
  logSecurityEvent,
  logAudit,
} from "@/lib/auth";

export const runtime = "nodejs";

const RegisterSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.string().email("Valid email required"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must include at least one uppercase letter")
    .regex(/[0-9]/, "Password must include at least one number"),
  organizationName: z.string().min(2, "Organization name must be at least 2 characters"),
  brandName: z.string().min(2, "Brand name must be at least 2 characters"),
  industry: z.string().min(2, "Industry is required"),
  primaryDomain: z
    .string()
    .min(3, "Domain is required")
    .regex(/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, "Must be a valid domain (e.g. brand.com)"),
  logoUrl: z
    .string({ required_error: "Brand logo URL is required" })
    .min(1, "Brand logo URL is required")
    .url("Must be a valid URL")
    .refine((url) => url.startsWith("https://"), {
      message: "Brand logo URL must be a secure HTTPS address (e.g. https://brand.com/logo.png)",
    }),
  description: z.string().min(10, "Please provide a brief brand description (min 10 chars)"),
  instagram: z.string().optional().nullable(),
  facebook: z.string().optional().nullable(),
  twitter: z.string().optional().nullable(),
  linkedin: z.string().optional().nullable(),
  youtube: z.string().optional().nullable(),
  socialHandles: z
    .object({
      instagram: z.string().optional().nullable(),
      facebook: z.string().optional().nullable(),
      twitter: z.string().optional().nullable(),
      linkedin: z.string().optional().nullable(),
      youtube: z.string().optional().nullable(),
    })
    .optional(),
});

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";
    const userAgent = req.headers.get("user-agent") || "unknown";

    const rateLimit = checkRateLimit(`register:${ip}`, 4, 60_000);
    if (!rateLimit.allowed) {
      await logSecurityEvent({
        eventType: "rate_limit_exceeded",
        ipAddress: ip,
        userAgent,
        severity: "high",
        details: { endpoint: "/api/auth/register" },
      });
      return NextResponse.json(
        { error: "Too many registration attempts. Please wait 60 seconds." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const parsed = RegisterSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || "Invalid registration form" },
        { status: 400 }
      );
    }

    const {
      fullName,
      email,
      password,
      organizationName,
      brandName,
      industry,
      primaryDomain,
      logoUrl,
      description,
    } = parsed.data;

    const socialHandles = parsed.data.socialHandles || {
      instagram: parsed.data.instagram,
      facebook: parsed.data.facebook,
      twitter: parsed.data.twitter,
      linkedin: parsed.data.linkedin,
      youtube: parsed.data.youtube,
    };

    const repo = getActiveRepository();

    // Check if email already registered via repository abstraction
    const existingUser = await repo.getUserByEmail(email);
    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email address already exists." },
        { status: 409 }
      );
    }

    // Password hash
    const { hash, salt } = hashPassword(password);

    // Atomic registration through repository abstraction
    const regResult = await repo.registerOrganization({
      email,
      passwordHash: hash,
      salt,
      fullName,
      organizationName,
      brandName,
      industry,
      primaryDomain,
      logoUrl,
      description,
      socialHandles,
    });

    await logAudit({
      actorId: regResult.userId,
      actorRole: "owner",
      action: "auth.register_organization",
      resourceType: "organization",
      resourceId: regResult.organizationId,
      metadata: { organizationName, brandName, primaryDomain, logoUrl, socialHandles },
    });

    const sessionToken = signSession({
      userId: regResult.userId,
      email: email.toLowerCase().trim(),
      role: "owner",
    });

    const response = NextResponse.json({
      success: true,
      redirect: "/owner/brand-profile",
    });

    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: sessionToken,
      httpOnly: true,
      secure: process.env.COOKIE_SECURE === "true" || (process.env.NODE_ENV === "production" && req.nextUrl.protocol === "https:"),
      sameSite: "lax",
      path: "/",
      maxAge: 86400 * 7,
    });

    return response;
  } catch (error: any) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred during registration. Please try again." },
      { status: 500 }
    );
  }
}
