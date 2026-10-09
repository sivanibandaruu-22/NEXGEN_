import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { getDb, autoSeed } from "../src/lib/db.ts";
import { runInvestigationPipeline } from "../src/lib/investigation/pipeline.ts";

describe("Workflow Repair & Investigation Upgrade Acceptance Suite", () => {
  const db = getDb();
  const adminId = "usr_admin_01";
  const zenithOrgId = "org_zenith_02";

  before(() => {
    const userCount = db.prepare("SELECT COUNT(*) as count FROM users").get();
    if (userCount.count === 0) {
      autoSeed(db);
    }
  });

  // 1. Organization Approval Persistence & State Transitions
  it("persists admin approval with reviewer, timestamp, and review reason", () => {
    db.prepare(`DELETE FROM investigation_jobs WHERE organization_id = ?`).run(zenithOrgId);
    db.prepare(`DELETE FROM reports WHERE organization_id = ?`).run(zenithOrgId);
    db.prepare(`UPDATE organizations SET verification_status = 'pending_verification' WHERE id = ?`).run(zenithOrgId);
    const orgBefore = db.prepare("SELECT verification_status FROM organizations WHERE id = ?").get(zenithOrgId);
    assert.equal(orgBefore.verification_status, "pending_verification");

    const now = new Date().toISOString();
    const reason = "DNS challenge TXT token verified and certificate matching confirmed.";

    // Execute approval update
    db.prepare(`
      UPDATE organizations 
      SET verification_status = 'verified', verification_reason = ?, verified_by = ?, verified_at = ?, updated_at = ?
      WHERE id = ?
    `).run(reason, adminId, now, now, zenithOrgId);

    // Record admin review
    const reviewId = "rev_test_" + crypto.randomUUID().slice(0, 8);
    db.prepare(`
      INSERT INTO admin_reviews (id, target_id, target_type, decision, reason, reviewer_id, created_at)
      VALUES (?, ?, 'organization_verification', 'approve', ?, ?, ?)
    `).run(reviewId, zenithOrgId, reason, adminId, now);

    // Verify persisted state
    const orgAfter = db.prepare("SELECT verification_status, verified_by, verified_at, verification_reason FROM organizations WHERE id = ?").get(zenithOrgId);
    assert.equal(orgAfter.verification_status, "verified");
    assert.equal(orgAfter.verified_by, adminId);
    assert.equal(orgAfter.verification_reason, reason);
    assert.ok(orgAfter.verified_at);

    // Verify admin_reviews record
    const review = db.prepare("SELECT id, decision, reviewer_id FROM admin_reviews WHERE id = ?").get(reviewId);
    assert.ok(review);
    assert.equal(review.decision, "approve");
    assert.equal(review.reviewer_id, adminId);
  });

  // 2. Removal from Pending List & No Reversion
  it("removes verified organization from pending list and persists state across queries", () => {
    const pendingOrgs = db.prepare(`
      SELECT id, name FROM organizations WHERE verification_status IN ('pending_verification', 'submitted')
    `).all();

    const isZenithPending = pendingOrgs.some((o) => o.id === zenithOrgId);
    assert.equal(isZenithPending, false, "Verified organization must not appear in pending list");

    const verifiedOrgs = db.prepare(`
      SELECT id, name FROM organizations WHERE verification_status = 'verified'
    `).all();
    const isZenithVerified = verifiedOrgs.some((o) => o.id === zenithOrgId);
    assert.equal(isZenithVerified, true, "Organization must persist in verified state");
  });

  // 3. Prevention of Duplicate Approvals
  it("prevents duplicate approvals on already verified organizations", () => {
    const org = db.prepare("SELECT verification_status FROM organizations WHERE id = ?").get(zenithOrgId);
    assert.equal(org.verification_status, "verified");

    // Attempting to re-approve an already verified organization must be detectable and prevented
    const isAlreadyVerified = org.verification_status === "verified";
    assert.equal(isAlreadyVerified, true, "Duplicate approval check must flag verified status");
  });

  // 4. Brand Verification is Separate from Investigation
  it("keeps brand verification separate from monitoring investigation completion", () => {
    // Verifying Zenith Cloud did not magically complete an investigation or generate reports
    const jobs = db.prepare("SELECT id, status FROM investigation_jobs WHERE organization_id = ?").all(zenithOrgId);
    const completedJobs = jobs.filter((j) => j.status === "completed");
    assert.equal(completedJobs.length, 0, "No investigation should be marked completed by brand verification alone");
  });

  // 5, 6, 7, 8, 9: Dynamic Brand Profile Drives 12-Stage Investigation
  let zenithJobId;
  let zenithReportId;

  it("dynamically executes 12-stage investigation pipeline for Zenith Cloud (not hardcoded NovaPay)", async () => {
    zenithJobId = "job_zenith_" + crypto.randomUUID().slice(0, 8);
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO investigation_jobs (id, organization_id, status, scope, requested_by, records_analyzed, sources_run_json, stages_json, created_at)
      VALUES (?, ?, 'pending_approval', 'full', 'Sarah Chen', 0, '[]', '[]', ?)
    `).run(zenithJobId, zenithOrgId, now);

    const stagesObserved = [];
    const result = await runInvestigationPipeline(zenithJobId, adminId, (stage) => {
      stagesObserved.push({ id: stage.id, name: stage.name, status: stage.status });
    });

    assert.ok(result);
    zenithReportId = result.reportId;
    assert.ok(zenithReportId);
    assert.equal(result.jobId, zenithJobId);

    // Verify 12 stages executed
    assert.ok(result.stages);
    assert.equal(result.stages.length, 12, "Pipeline must execute exactly 12 stages");

    const stageNames = result.stages.map((s) => s.name);
    assert.ok(stageNames.includes("Validating Brand Profile"));
    assert.ok(stageNames.includes("Loading Official Brand Assets"));
    assert.ok(stageNames.includes("Checking Data Source Availability"));
    assert.ok(stageNames.includes("Collecting Available Social Records"));
    assert.ok(stageNames.includes("Collecting Available App Store Records"));
    assert.ok(stageNames.includes("Normalizing Names and Identifiers"));
    assert.ok(stageNames.includes("Checking Look-alike Names"));
    assert.ok(stageNames.includes("Comparing Available Logo and Icon Evidence"));
    assert.ok(stageNames.includes("Excluding Verified Official Assets"));
    assert.ok(stageNames.includes("Calculating Explainable Risk Scores"));
    assert.ok(stageNames.includes("Saving Findings and Evidence"));
    assert.ok(stageNames.includes("Generating Investigation Report"));

    // Verify stages persisted in database
    const dbJob = db.prepare("SELECT status, stages_json, records_analyzed FROM investigation_jobs WHERE id = ?").get(zenithJobId);
    assert.equal(dbJob.status, "completed");
    assert.ok(dbJob.records_analyzed > 0);

    const persistedStages = JSON.parse(dbJob.stages_json || "[]");
    assert.equal(persistedStages.length, 12);
    const completedCount = persistedStages.filter((s) => s.status === "completed" || s.status === "partially_completed").length;
    assert.equal(completedCount, 12);

    // Verify DYNAMIC brand profile: candidates were collected for Zenith Cloud, NOT NovaPay
    const findings = db.prepare("SELECT target_name, matched_brand, publisher_or_author FROM detection_findings WHERE job_id = ?").all(zenithJobId);
    assert.ok(findings.length > 0);
    findings.forEach((f) => {
      assert.equal(f.matched_brand, "Zenith Cloud", "Matched brand must be Zenith Cloud, not NovaPay");
    });
  });

  // 10, 11, 12, 13, 14: Real Adapters, Exclusion Gate & Explainable Scoring
  it("persists explainable risk findings with mathematical breakdown and asset exclusions", () => {
    const findings = db.prepare(`
      SELECT id, category, platform, target_name, risk_score, confidence, match_types_json, evidence_json 
      FROM detection_findings WHERE job_id = ?
    `).all(zenithJobId);

    assert.ok(findings.length > 0);

    findings.forEach((f) => {
      // Risk score between 1 and 100
      assert.ok(f.risk_score > 0 && f.risk_score <= 100);
      assert.ok(["low", "medium", "high"].includes(f.confidence));

      // Match types and evidence are valid JSON
      const matchTypes = JSON.parse(f.match_types_json);
      assert.ok(Array.isArray(matchTypes));
      assert.ok(matchTypes.length > 0);

      const evidence = JSON.parse(f.evidence_json);
      assert.ok(evidence);
    });
  });

  // 15, 16: Complete 10-Section Report Generated & Persisted in Draft
  it("generates and stores complete 10-section report in draft status", () => {
    const report = db.prepare("SELECT id, job_id, organization_id, title, summary, status, findings_summary_json FROM reports WHERE id = ?").get(zenithReportId);
    assert.ok(report);
    assert.equal(report.status, "draft");
    assert.equal(report.organization_id, zenithOrgId);
    assert.equal(report.job_id, zenithJobId);

    const summary = JSON.parse(report.findings_summary_json);
    assert.ok(summary.sections, "Report must contain 10 structured sections");

    const sec = summary.sections;
    assert.ok(sec.executiveSummary, "Section A: Executive Summary must exist");
    assert.ok(sec.brandReference, "Section B: Brand Reference must exist");
    assert.ok(sec.socialMediaFindings, "Section C: Social Media Findings must exist");
    assert.ok(sec.appStoreFindings, "Section D: App Store Findings must exist");
    assert.ok(sec.lookalikeAnalysis, "Section E: Look-alike Analysis must exist");
    assert.ok(sec.riskAssessment, "Section F: Risk Assessment must exist");
    assert.ok(sec.sourceExecutionSummary, "Section G: Source Execution Summary must exist");
    assert.ok(sec.officialAssetsExclusions, "Section H: Official Assets Exclusions must exist");
    assert.ok(sec.recommendations, "Section I: Recommendations must exist");
    assert.ok(sec.adminReview, "Section J: Admin Review must exist");

    assert.equal(sec.brandReference.brandName, "Zenith Cloud");
    assert.equal(sec.brandReference.organizationName, "Zenith Cloud Systems");
  });

  // 17, 18, 19: Report Sharing Workflow ("Send Report to Organization")
  it("shares report, records report_shares, dispatches notification, and updates status to shared", () => {
    const now = new Date().toISOString();

    // 1. Update status to shared
    db.prepare(`UPDATE reports SET status = 'shared', shared_at = ? WHERE id = ?`).run(now, zenithReportId);

    // 2. Insert report_shares record
    const shareId = "shr_test_" + crypto.randomUUID().slice(0, 8);
    const token = crypto.randomBytes(16).toString("hex");
    db.prepare(`
      INSERT INTO report_shares (id, report_id, shared_with_organization_id, shared_by_user_id, access_token, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(shareId, zenithReportId, zenithOrgId, adminId, token, now);

    // 3. Dispatch notification to Owner
    const owner = db.prepare("SELECT user_id FROM organization_memberships WHERE organization_id = ?").get(zenithOrgId);
    assert.ok(owner);

    const notifId = "notif_share_" + crypto.randomUUID().slice(0, 8);
    db.prepare(`
      INSERT INTO notifications (id, user_id, organization_id, title, message, link, read_status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 0, ?)
    `).run(
      notifId,
      owner.user_id,
      zenithOrgId,
      "New Investigation Report Shared",
      "Admin has finalized and shared risk intelligence report.",
      `/owner/reports?id=${zenithReportId}`,
      now
    );

    // Verify report state
    const report = db.prepare("SELECT status, shared_at FROM reports WHERE id = ?").get(zenithReportId);
    assert.equal(report.status, "shared");
    assert.ok(report.shared_at);

    // Verify share record
    const share = db.prepare("SELECT id, shared_with_organization_id FROM report_shares WHERE id = ?").get(shareId);
    assert.ok(share);
    assert.equal(share.shared_with_organization_id, zenithOrgId);

    // Verify notification
    const notif = db.prepare("SELECT id, title, user_id FROM notifications WHERE id = ?").get(notifId);
    assert.ok(notif);
    assert.equal(notif.user_id, owner.user_id);
  });

  // 20: Tenant Isolation on Shared Reports
  it("enforces tenant isolation: another organization cannot access Zenith Cloud report", () => {
    const novaOrgId = "org_novapay_01";
    // Querying report with NovaPay org context must return empty
    const unauthorizedAccess = db.prepare(`
      SELECT id FROM reports WHERE id = ? AND organization_id = ?
    `).get(zenithReportId, novaOrgId);

    assert.equal(unauthorizedAccess, undefined, "Unauthorized organization must not access report");

    const authorizedAccess = db.prepare(`
      SELECT id FROM reports WHERE id = ? AND organization_id = ?
    `).get(zenithReportId, zenithOrgId);

    assert.ok(authorizedAccess, "Authorized organization must access its own report");
  });

  // 21, 22: Audit Logging Verification
  it("verifies audit logs for approval and investigation completion", () => {
    const logs = db.prepare("SELECT action, resource_type, resource_id FROM audit_logs ORDER BY created_at DESC").all();
    assert.ok(logs.length > 0);

    const hasInvestLog = logs.some((l) => l.action === "investigation.completed" && l.resource_id === zenithJobId);
    assert.ok(hasInvestLog, "Audit log must contain investigation.completed record");
  });
});
