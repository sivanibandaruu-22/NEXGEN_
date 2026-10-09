import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  analyzeLookalikeName,
  normalizeName,
  damerauLevenshteinDistance,
  jaroWinklerSimilarity,
} from "../src/lib/detection/lookalike.ts";

describe("Look-alike Name Detection Engine", () => {
  it("normalizes unicode NFKC and homoglyphs correctly", () => {
    // Cyrillic 'о' (\u043E) and Cyrillic 'а' (\u0430)
    const spoofed = "N\u043Ev\u0430";
    const res = normalizeName(spoofed);
    assert.equal(res.normalized, "nova");
    assert.ok(res.transformations.length > 0);
  });

  it("handles leetspeak substitutions (@ -> a, 0 -> o, 1 -> i)", () => {
    const leet = "N0v@P@y";
    const res = normalizeName(leet);
    assert.equal(res.normalized, "novapay");
    assert.ok(res.transformations.some((t) => t.includes("leetspeak")));
  });

  it("calculates Damerau-Levenshtein distance with transposition awareness", () => {
    // Adjacent transposition 'va' -> 'av' has distance 1
    const dist = damerauLevenshteinDistance("novapay", "noavpay");
    assert.equal(dist, 1);
  });

  it("flags high risk for homoglyph look-alike spoof", () => {
    const result = analyzeLookalikeName("N\u043Ev\u0430Pay", "NovaPay");
    assert.ok(result.isMatch);
    assert.ok(result.riskScore >= 80);
    assert.ok(result.matchTypes.includes("homoglyph_deception"));
  });

  it("flags high risk for suspicious prefix/suffix additions", () => {
    const result = analyzeLookalikeName("NovaPay_SupportDesk", "NovaPay");
    assert.ok(result.isMatch);
    assert.ok(result.riskScore >= 70);
    assert.ok(result.matchTypes.some((m) => m.includes("suspicious")));
  });

  it("protects registered legitimate aliases with zero risk", () => {
    const result = analyzeLookalikeName("Nova Pay", "NovaPay", ["Nova Pay", "NovaPay Wallet"]);
    assert.ok(result.isMatch);
    assert.equal(result.isLegitimateAlias, true);
    assert.equal(result.riskScore, 0);
    assert.ok(result.matchTypes.includes("legitimate_alias"));
  });

  it("correctly identifies completely unrelated words as benign", () => {
    const result = analyzeLookalikeName("SuperNova Astronomy", "NovaPay");
    assert.equal(result.isMatch, false);
    assert.ok(result.riskScore < 40);
  });
});
