/**
 * LOOK-ALIKE NAME DETECTION ENGINE
 * Deterministic, tested similarity and transformation engine.
 * Handles Unicode homoglyphs, leetspeak, transpositions, insertions, deletions,
 * spacing/punctuation changes, and suspicious affixes.
 */

// Homoglyph character map (Cyrillic, Greek, special Latin look-alikes to ASCII Latin)
const HOMOGLYPH_MAP: Record<string, string> = {
  // Cyrillic
  а: "a",
  А: "a",
  в: "b",
  В: "b",
  е: "e",
  Е: "e",
  к: "k",
  К: "k",
  м: "m",
  М: "m",
  н: "h",
  Н: "h",
  о: "o",
  О: "o",
  р: "p",
  Р: "p",
  с: "c",
  С: "c",
  т: "t",
  Т: "t",
  у: "y",
  У: "y",
  х: "x",
  Х: "x",
  і: "i",
  І: "i",
  ј: "j",
  Ј: "j",
  // Greek
  α: "a",
  Α: "a",
  β: "b",
  Β: "b",
  ε: "e",
  Ε: "e",
  ι: "i",
  Ι: "i",
  κ: "k",
  Κ: "k",
  ν: "v",
  Ν: "n",
  ο: "o",
  Ο: "o",
  ρ: "p",
  Ρ: "p",
  τ: "t",
  Τ: "t",
  υ: "u",
  Υ: "y",
  χ: "x",
  Χ: "x",
};

// Leetspeak substitutions
const LEET_MAP: Record<string, string> = {
  "@": "a",
  "4": "a",
  "8": "b",
  "3": "e",
  "1": "i", // also can be 'l'
  "!": "i",
  "0": "o",
  "5": "s",
  $: "s",
  "+": "t",
  "7": "t",
  "2": "z",
};

// Common suspicious affixes used by impersonators
export const SUSPICIOUS_AFFIXES = [
  "official",
  "support",
  "help",
  "desk",
  "care",
  "service",
  "services",
  "verify",
  "verification",
  "verified",
  "security",
  "secure",
  "rewards",
  "reward",
  "claim",
  "claims",
  "gift",
  "bonus",
  "live",
  "online",
  "portal",
  "login",
  "auth",
  "team",
  "app",
  "wallet",
  "pay",
  "finance",
  "global",
  "group",
  "direct",
];

export interface LookalikeMatchResult {
  targetName: string;
  brandName: string;
  isMatch: boolean;
  isLegitimateAlias: boolean;
  similarityScore: number; // 0 to 100
  riskScore: number; // 0 to 100
  transformations: string[];
  matchTypes: string[];
  normalizedTarget: string;
  normalizedBrand: string;
}

/**
 * Normalizes string: NFKC unicode, maps homoglyphs & leetspeak, strips punctuation & whitespace
 */
export function normalizeName(str: string): { normalized: string; transformations: string[] } {
  const transformations: string[] = [];
  if (!str) return { normalized: "", transformations };

  // 1. Unicode NFKC
  let current = str.normalize("NFKC");
  if (current !== str) {
    transformations.push("Unicode normalization applied");
  }

  // 2. Homoglyph detection
  let homoglyphsDetected = 0;
  let homoglyphReplaced = "";
  for (const char of current) {
    if (HOMOGLYPH_MAP[char]) {
      homoglyphReplaced += HOMOGLYPH_MAP[char];
      homoglyphsDetected++;
    } else {
      homoglyphReplaced += char;
    }
  }
  if (homoglyphsDetected > 0) {
    transformations.push(`Detected ${homoglyphsDetected} visually deceptive Unicode homoglyph character(s)`);
  }
  current = homoglyphReplaced;

  // 3. Leet speak detection
  let leetDetected = 0;
  let leetReplaced = "";
  for (const char of current) {
    if (LEET_MAP[char]) {
      leetReplaced += LEET_MAP[char];
      leetDetected++;
    } else {
      leetReplaced += char;
    }
  }
  if (leetDetected > 0) {
    transformations.push(`Detected ${leetDetected} leetspeak character substitution(s)`);
  }
  current = leetReplaced;

  // 4. Strip punctuation, hyphens, dots, underscores, whitespace
  const stripped = current.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (stripped !== current.toLowerCase()) {
    transformations.push("Removed separators, punctuation, or spaces");
  }

  return { normalized: stripped, transformations };
}

/**
 * Calculates Damerau-Levenshtein Distance (handles insertions, deletions, substitutions, and adjacent transpositions)
 */
export function damerauLevenshteinDistance(source: string, target: string): number {
  const sLen = source.length;
  const tLen = target.length;
  if (sLen === 0) return tLen;
  if (tLen === 0) return sLen;

  const dist: number[][] = Array.from({ length: sLen + 1 }, () => Array(tLen + 1).fill(0));

  for (let i = 0; i <= sLen; i++) dist[i][0] = i;
  for (let j = 0; j <= tLen; j++) dist[0][j] = j;

  for (let i = 1; i <= sLen; i++) {
    for (let j = 1; j <= tLen; j++) {
      const cost = source[i - 1] === target[j - 1] ? 0 : 1;

      dist[i][j] = Math.min(
        dist[i - 1][j] + 1, // deletion
        dist[i][j - 1] + 1, // insertion
        dist[i - 1][j - 1] + cost // substitution
      );

      // Transposition check
      if (
        i > 1 &&
        j > 1 &&
        source[i - 1] === target[j - 2] &&
        source[i - 2] === target[j - 1]
      ) {
        dist[i][j] = Math.min(dist[i][j], dist[i - 2][j - 2] + 1);
      }
    }
  }

  return dist[sLen][tLen];
}

/**
 * Jaro-Winkler Similarity (gives higher score to strings that match from the beginning)
 */
export function jaroWinklerSimilarity(s1: string, s2: string): number {
  if (s1 === s2) return 1.0;
  const len1 = s1.length;
  const len2 = s2.length;
  if (len1 === 0 || len2 === 0) return 0.0;

  const matchDistance = Math.floor(Math.max(len1, len2) / 2) - 1;
  const s1Matches = new Array(len1).fill(false);
  const s2Matches = new Array(len2).fill(false);

  let matches = 0;
  for (let i = 0; i < len1; i++) {
    const start = Math.max(0, i - matchDistance);
    const end = Math.min(i + matchDistance + 1, len2);
    for (let j = start; j < end; j++) {
      if (s2Matches[j]) continue;
      if (s1[i] !== s2[j]) continue;
      s1Matches[i] = true;
      s2Matches[j] = true;
      matches++;
      break;
    }
  }

  if (matches === 0) return 0.0;

  let k = 0;
  let transpositions = 0;
  for (let i = 0; i < len1; i++) {
    if (!s1Matches[i]) continue;
    while (!s2Matches[k]) k++;
    if (s1[i] !== s2[k]) transpositions++;
    k++;
  }

  const jaro = (matches / len1 + matches / len2 + (matches - transpositions / 2) / matches) / 3;

  // Winkler prefix scale (max 4 chars)
  let prefix = 0;
  for (let i = 0; i < Math.min(4, len1, len2); i++) {
    if (s1[i] === s2[i]) prefix++;
    else break;
  }

  return jaro + prefix * 0.1 * (1 - jaro);
}

/**
 * Comprehensive Look-alike Analyzer
 */
export function analyzeLookalikeName(
  candidate: string,
  brandName: string,
  knownAliases: string[] = []
): LookalikeMatchResult {
  const normCandidate = normalizeName(candidate);
  const normBrand = normalizeName(brandName);

  const transformations: string[] = [...normCandidate.transformations];
  const matchTypes: string[] = [];

  const targetStr = normCandidate.normalized;
  const brandStr = normBrand.normalized;

  // Check if candidate is known legitimate alias
  const isAlias = knownAliases.some((alias) => {
    const normAlias = normalizeName(alias).normalized;
    return normAlias === targetStr || candidate.toLowerCase().trim() === alias.toLowerCase().trim();
  });

  if (isAlias) {
    return {
      targetName: candidate,
      brandName,
      isMatch: true,
      isLegitimateAlias: true,
      similarityScore: 100,
      riskScore: 0, // Legitimate alias has zero risk
      transformations: ["Recognized registered legitimate brand alias / variation"],
      matchTypes: ["legitimate_alias"],
      normalizedTarget: targetStr,
      normalizedBrand: brandStr,
    };
  }

  // Exact normalized match
  if (targetStr === brandStr) {
    if (normCandidate.transformations.length > 0) {
      matchTypes.push("homoglyph_deception");
      transformations.push("Exact phonetic/visual identity achieved via obfuscated characters");
      return {
        targetName: candidate,
        brandName,
        isMatch: true,
        isLegitimateAlias: false,
        similarityScore: 100,
        riskScore: 95,
        transformations,
        matchTypes,
        normalizedTarget: targetStr,
        normalizedBrand: brandStr,
      };
    } else {
      // Identical string
      matchTypes.push("exact_name_match");
      return {
        targetName: candidate,
        brandName,
        isMatch: true,
        isLegitimateAlias: false,
        similarityScore: 100,
        riskScore: 85,
        transformations: ["Exact name replication"],
        matchTypes,
        normalizedTarget: targetStr,
        normalizedBrand: brandStr,
      };
    }
  }

  // Check for inserted suspicious affixes (e.g., novapaysupport, officialnovapay, novapaysupportdesk)
  let foundAffix: string | null = null;
  if (targetStr.includes(brandStr)) {
    const remainder = targetStr.replace(brandStr, "");
    for (const affix of SUSPICIOUS_AFFIXES) {
      if (remainder.includes(affix)) {
        foundAffix = `term '${affix}'`;
        matchTypes.push("suspicious_affix");
        break;
      }
    }
  } else {
    for (const affix of SUSPICIOUS_AFFIXES) {
      if (targetStr.startsWith(affix) && targetStr.slice(affix.length) === brandStr) {
        foundAffix = `prefix '${affix}'`;
        matchTypes.push("suspicious_prefix");
        break;
      }
      if (targetStr.endsWith(affix) && targetStr.slice(0, targetStr.length - affix.length) === brandStr) {
        foundAffix = `suffix '${affix}'`;
        matchTypes.push("suspicious_suffix");
        break;
      }
    }
  }

  if (foundAffix) {
    transformations.push(`Added high-risk impersonation ${foundAffix}`);
  }

  // Distance metrics
  const dist = damerauLevenshteinDistance(brandStr, targetStr);
  const jaro = jaroWinklerSimilarity(brandStr, targetStr);
  const maxLen = Math.max(brandStr.length, targetStr.length);
  const editRatio = maxLen > 0 ? 1 - dist / maxLen : 0;

  // Check character transposition
  if (dist === 1 && brandStr.length === targetStr.length) {
    matchTypes.push("character_transposition");
    transformations.push("Adjacent characters transposed / swapped");
  } else if (dist === 1 && targetStr.length > brandStr.length) {
    matchTypes.push("inserted_character");
    transformations.push("Single character inserted");
  } else if (dist === 1 && targetStr.length < brandStr.length) {
    matchTypes.push("deleted_character");
    transformations.push("Single character deleted");
  } else if (dist === 1) {
    matchTypes.push("character_substitution");
    transformations.push("Single character replaced");
  }

  // Calculate composite similarity score (0 to 100)
  let similarityScore = Math.round((jaro * 0.6 + editRatio * 0.4) * 100);

  // If suspicious affix was present on the exact brand name, similarity is extremely high
  if (foundAffix) {
    similarityScore = Math.max(similarityScore, 85);
  }

  // Calculate explainable Risk Score
  let riskScore = 0;
  if (foundAffix) {
    riskScore += 45;
  }
  if (matchTypes.includes("homoglyph_deception")) {
    riskScore += 50;
  }
  if (matchTypes.includes("character_transposition") || matchTypes.includes("character_substitution")) {
    riskScore += 35;
  }

  // Factor in similarity
  if (similarityScore >= 85) {
    riskScore += 40;
  } else if (similarityScore >= 70) {
    riskScore += 25;
  } else if (similarityScore >= 55) {
    riskScore += 10;
  }

  riskScore = Math.min(100, Math.max(0, riskScore));

  const isMatch = similarityScore >= 65 || Boolean(foundAffix) || riskScore >= 50;

  return {
    targetName: candidate,
    brandName,
    isMatch,
    isLegitimateAlias: false,
    similarityScore,
    riskScore,
    transformations: transformations.length > 0 ? transformations : ["Slight linguistic divergence"],
    matchTypes: matchTypes.length > 0 ? matchTypes : ["fuzzy_similarity"],
    normalizedTarget: targetStr,
    normalizedBrand: brandStr,
  };
}
