/**
 * EXPLAINABLE RISK SCORING ENGINE
 * Deterministic weighted scoring with missing-signal weight re-normalization.
 */

export interface SignalInput {
  name: string;
  category: "name_similarity" | "publisher_entity" | "bio_keywords" | "outbound_url" | "icon_similarity" | "account_badge";
  available: boolean;
  score: number; // 0 to 100
  baseWeight: number; // e.g. 0.35
  evidenceNotes: string;
}

export interface ScoreExplanation {
  overallRiskScore: number; // 0 to 100
  similarityScore: number; // 0 to 100
  confidence: "low" | "medium" | "high";
  severity: "critical" | "high" | "medium" | "low" | "benign";
  signals: {
    name: string;
    score: number;
    baseWeight: number;
    normalizedWeight: number;
    contribution: number;
    available: boolean;
    evidenceNotes: string;
  }[];
  missingSignals: string[];
  rationale: string;
}

export function calculateExplainableRiskScore(
  signals: SignalInput[],
  nominalSimilarity: number = 0
): ScoreExplanation {
  const availableSignals = signals.filter((s) => s.available);
  const missingSignals = signals.filter((s) => !s.available).map((s) => s.name);

  // Sum of weights of available signals
  const totalAvailableWeight = availableSignals.reduce((acc, s) => acc + s.baseWeight, 0);

  let weightedSum = 0;
  const signalBreakdown = signals.map((s) => {
    if (!s.available || totalAvailableWeight === 0) {
      return {
        name: s.name,
        score: s.score,
        baseWeight: s.baseWeight,
        normalizedWeight: 0,
        contribution: 0,
        available: false,
        evidenceNotes: s.evidenceNotes || "Signal unavailable or unconfigured from source adapter.",
      };
    }

    // Re-normalize weight so sum of available weights equals 1.0
    const normalizedWeight = s.baseWeight / totalAvailableWeight;
    const contribution = Math.round(s.score * normalizedWeight * 10) / 10;
    weightedSum += s.score * normalizedWeight;

    return {
      name: s.name,
      score: s.score,
      baseWeight: s.baseWeight,
      normalizedWeight: Math.round(normalizedWeight * 100) / 100,
      contribution,
      available: true,
      evidenceNotes: s.evidenceNotes,
    };
  });

  const finalScore = Math.min(100, Math.max(0, Math.round(weightedSum)));

  // Determine Confidence based on fraction of signals available
  const availableCount = availableSignals.length;
  let confidence: "low" | "medium" | "high" = "low";
  if (availableCount >= 4) {
    confidence = "high";
  } else if (availableCount >= 2) {
    confidence = "medium";
  }

  // Severity classification
  let severity: "critical" | "high" | "medium" | "low" | "benign" = "benign";
  if (finalScore >= 80) severity = "critical";
  else if (finalScore >= 60) severity = "high";
  else if (finalScore >= 40) severity = "medium";
  else if (finalScore > 10) severity = "low";

  // Rationale synthesis
  const highRiskSignals = availableSignals.filter((s) => s.score >= 70).map((s) => s.name);
  let rationale = "";
  if (finalScore >= 80) {
    rationale = `High-probability targeted impersonation. Elevated threat detected across ${highRiskSignals.join(", ")}. Immediate brand takedown or warning recommended.`;
  } else if (finalScore >= 60) {
    rationale = `Likely impersonation or unauthorized brand asset usage. Primary risk drivers: ${highRiskSignals.join(", ")}. Requires analyst triage.`;
  } else if (finalScore >= 40) {
    rationale = `Moderate risk indicator. Significant name or profile overlap observed, but insufficient corroborating deception signals.`;
  } else {
    rationale = `Low impersonation risk. Candidate lacks aggressive deceptive markers or publisher entity conflict.`;
  }

  return {
    overallRiskScore: finalScore,
    similarityScore: nominalSimilarity,
    confidence,
    severity,
    signals: signalBreakdown,
    missingSignals,
    rationale,
  };
}
