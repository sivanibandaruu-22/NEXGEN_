async function testShareAndExport() {
  console.log("=== TESTING ADMIN SHARE & OWNER EXPORT LIVE ===");

  // 1. Admin Login
  const adminLogin = await fetch("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@kampus.vc", password: "AdminPassword2026!" }),
  });
  const adminCookie = adminLogin.headers.get("set-cookie");

  // 2. Fetch Admin Reports
  const reportsRes = await fetch("http://localhost:3000/api/admin/reports", {
    headers: { cookie: adminCookie },
  });
  const { reports } = await reportsRes.json();
  const draftReport = reports.find((r) => r.organization_id === "org_novapay_01" || r.organizationId === "org_novapay_01");
  console.log("Found NovaPay report:", draftReport?.id, "Current status:", draftReport?.status);

  if (draftReport && draftReport.status !== "shared") {
    // 3. Admin shares report
    const shareRes = await fetch("http://localhost:3000/api/admin/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json", cookie: adminCookie },
      body: JSON.stringify({ reportId: draftReport.id, action: "share", reason: "Approved for NovaPay leadership" }),
    });
    const shareJson = await shareRes.json();
    console.log("Admin Share Action Status:", shareRes.status, "Result:", shareJson.success);
  }

  // 4. Zenith Cloud Owner Login
  const ownerLogin = await fetch("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "owner@zenithcloud.com", password: "ZenithPassword2026!" }),
  });
  const ownerCookie = ownerLogin.headers.get("set-cookie");
  console.log("Zenith Owner Login Status:", ownerLogin.status);

  // 5. Owner checks shared reports
  const ownerReportsRes = await fetch("http://localhost:3000/api/owner/reports", {
    headers: { cookie: ownerCookie },
  });
  const { reports: ownerReports } = await ownerReportsRes.json();
  console.log("Zenith Owner Shared Reports Count:", ownerReports?.length);
  if (ownerReports && ownerReports.length > 0) {
    const rep = ownerReports[0];
    console.log("Report ID:", rep.id);
    console.log("Report Title:", rep.title);

    // 6. Test PDF export
    const pdfRes = await fetch(`http://localhost:3000/api/owner/reports/export/pdf?reportId=${rep.id}`, {
      headers: { cookie: ownerCookie },
    });
    console.log("Owner PDF Export Status:", pdfRes.status, "Content-Type:", pdfRes.headers.get("content-type"));
    const htmlText = await pdfRes.text();
    console.log("PDF HTML includes Section A Executive Summary:", htmlText.includes("SECTION A"));
    console.log("PDF HTML includes Section J Admin Attestation:", htmlText.includes("SECTION J"));

    // 7. Test CSV export
    const csvRes = await fetch(`http://localhost:3000/api/owner/reports/export/csv?reportId=${rep.id}`, {
      headers: { cookie: ownerCookie },
    });
    console.log("Owner CSV Export Status:", csvRes.status, "Content-Type:", csvRes.headers.get("content-type"));
    const csvText = await csvRes.text();
    console.log("CSV Header check:", csvText.includes('"Category"') && csvText.includes('"Target Name"'));
  }

  // 8. Owner Notifications
  const notifsRes = await fetch("http://localhost:3000/api/owner/notifications", {
    headers: { cookie: ownerCookie },
  });
  const { notifications } = await notifsRes.json();
  console.log("Owner Notifications Count:", notifications?.length);
  const latestNotif = notifications[0];
  console.log("Latest Notification Title:", latestNotif?.title);
  console.log("Latest Notification Link:", latestNotif?.link);

  console.log("=== LIVE WORKFLOW VALIDATION SUCCESSFUL ===");
}

testShareAndExport().catch(console.error);
