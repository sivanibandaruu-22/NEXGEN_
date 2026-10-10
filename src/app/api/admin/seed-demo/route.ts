
import { NextResponse } from "next/server";
import { hashPassword } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase-server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  // Protect this one-time endpoint with a secret configured in Render.
  const secret = process.env.SEED_DEMO_SECRET;
  if (!secret || req.headers.get("x-seed-secret") !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date().toISOString();

  const accounts = [
    {
      id: "usr_admin_01",
      email: "admin@kampus.vc",
      password: "AdminPassword2026!",
      role: "admin",
      full_name: "Kampus Security Administrator",
    },
    {
      id: "usr_owner_novapay",
      email: "owner@novapay.io",
      password: "OwnerPassword2026!",
      role: "owner",
      full_name: "Alex Vance (NovaPay VP Security)",
    },
  ];

  const results = [];

  for (const account of accounts) {
    const existing = await supabaseServer
      .from("users")
      .select("id")
      .eq("email", account.email)
      .maybeSingle();

    if (existing.error) {
      return NextResponse.json({ error: existing.error.message }, { status: 500 });
    }

    if (existing.data) {
      results.push(`${account.email}: already exists`);
      continue;
    }

    const auth = hashPassword(account.password);
    const { password, ...user } = account;

    const { error } = await supabaseServer.from("users").insert({
      ...user,
      password_hash: auth.hash,
      salt: auth.salt,
      is_verified: 1,
      created_at: now,
      updated_at: now,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    results.push(`${account.email}: created`);
  }

  return NextResponse.json({ success: true, results });
}
