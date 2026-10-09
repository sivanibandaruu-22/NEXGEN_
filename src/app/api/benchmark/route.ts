import { NextResponse } from "next/server";
import { runBenchmarkEvaluation } from "@/lib/detection/evaluationDataset";

export const runtime = "nodejs";

export async function GET() {
  const benchmark = runBenchmarkEvaluation();
  return NextResponse.json(benchmark);
}
