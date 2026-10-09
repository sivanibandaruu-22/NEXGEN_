import { describe, it } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { isPrivateOrReservedIP, validateSafeOutboundUrl } from "../src/lib/security/ssrf.ts";

describe("Security Architecture & SSRF Defenses", () => {
  it("blocks private, loopback, and cloud metadata IPv4 addresses", () => {
    assert.equal(isPrivateOrReservedIP("127.0.0.1"), true, "Loopback must be blocked");
    assert.equal(isPrivateOrReservedIP("127.0.0.100"), true, "127/8 range must be blocked");
    assert.equal(isPrivateOrReservedIP("169.254.169.254"), true, "Cloud metadata IP must be blocked");
    assert.equal(isPrivateOrReservedIP("10.0.1.5"), true, "10/8 RFC1918 must be blocked");
    assert.equal(isPrivateOrReservedIP("192.168.1.1"), true, "192.168/16 RFC1918 must be blocked");
    assert.equal(isPrivateOrReservedIP("172.16.0.1"), true, "172.16/12 RFC1918 must be blocked");
  });

  it("blocks IPv6 loopback and private ranges", () => {
    assert.equal(isPrivateOrReservedIP("::1"), true, "IPv6 loopback must be blocked");
    assert.equal(isPrivateOrReservedIP("fe80::1"), true, "IPv6 link-local must be blocked");
    assert.equal(isPrivateOrReservedIP("::ffff:127.0.0.1"), true, "IPv4-mapped loopback must be blocked");
  });

  it("allows standard public internet IPv4 addresses", () => {
    assert.equal(isPrivateOrReservedIP("93.184.216.34"), false, "Public IP must be allowed");
    assert.equal(isPrivateOrReservedIP("8.8.8.8"), false, "Public DNS IP must be allowed");
  });

  it("rejects dangerous non-http protocols in validateSafeOutboundUrl", async () => {
    const fileRes = await validateSafeOutboundUrl("file:///etc/passwd");
    assert.equal(fileRes.safe, false);
    assert.ok(fileRes.error.includes("Disallowed protocol"));

    const gopherRes = await validateSafeOutboundUrl("gopher://127.0.0.1:70/");
    assert.equal(gopherRes.safe, false);
  });

  it("performs constant-time scrypt password hashing with random salts", () => {
    const password = "ComplexSecurityPassword2026!";
    const salt = crypto.randomBytes(16).toString("hex");
    const derived = crypto.scryptSync(password, salt, 64);
    assert.equal(derived.length, 64);

    // Verify correct password matches
    const verifyDerived = crypto.scryptSync(password, salt, 64);
    assert.equal(crypto.timingSafeEqual(derived, verifyDerived), true);

    // Wrong password fails
    const wrongDerived = crypto.scryptSync("WrongPassword!", salt, 64);
    assert.equal(crypto.timingSafeEqual(derived, wrongDerived), false);
  });
});
