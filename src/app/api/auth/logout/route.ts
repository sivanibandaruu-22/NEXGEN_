import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, getCurrentUser, logAudit } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST() {
  const user = await getCurrentUser();
  if (user) {
    await logAudit({
      actorId: user.userId,
      actorRole: user.role,
      action: "auth.logout",
      resourceType: "user",
      resourceId: user.userId,
    });
  }

  const response = NextResponse.json({ success: true, redirect: "/login" });
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    expires: new Date(0),
    path: "/",
  });

  return response;
}
