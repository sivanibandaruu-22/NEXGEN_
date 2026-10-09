import { NextResponse } from "next/server";
import { getCurrentUser, AuthDatabaseError } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.userId,
        email: user.email,
        role: user.role,
        fullName: user.fullName,
        organizationId: user.organizationId,
        organizationName: user.organizationName,
        organizationSlug: user.organizationSlug,
        verificationStatus: user.verificationStatus,
      },
    });
  } catch (error: any) {
    if (error instanceof AuthDatabaseError) {
      return NextResponse.json(
        { error: "Authentication service temporarily unavailable. Please try again." },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

