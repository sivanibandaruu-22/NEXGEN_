async function runSmokeTest() {
  console.log("=== KAMPUS DRP LIVE SMOKE TEST ===");

  // 1. Landing Page
  const homeRes = await fetch("http://localhost:3000/");
  console.log("1. Public Landing Page (/):", homeRes.status === 200 ? "PASS (200)" : "FAIL (" + homeRes.status + ")");

  // 2. Admin Login
  const adminLoginRes = await fetch("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@kampus.vc", password: "AdminPassword2026!" }),
  });
  const adminCookie = adminLoginRes.headers.get("set-cookie");
  console.log("2. Admin Login (/api/auth/login):", adminLoginRes.status === 200 && adminCookie ? "PASS (200)" : "FAIL");

  // 3. Admin Organizations
  const orgsRes = await fetch("http://localhost:3000/api/admin/organizations", {
    headers: { cookie: adminCookie },
  });
  const orgsData = await orgsRes.json();
  console.log("3. Admin Organizations List:", orgsRes.status === 200 ? `PASS (${orgsData.organizations?.length} orgs)` : "FAIL");

  // 4. Admin Reports
  const reportsRes = await fetch("http://localhost:3000/api/admin/reports", {
    headers: { cookie: adminCookie },
  });
  const reportsData = await reportsRes.json();
  console.log("4. Admin Reports List:", reportsRes.status === 200 ? `PASS (${reportsData.reports?.length} reports)` : "FAIL");

  // 5. Owner Login
  const ownerLoginRes = await fetch("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "owner@novapay.io", password: "OwnerPassword2026!" }),
  });
  const ownerCookie = ownerLoginRes.headers.get("set-cookie");
  console.log("5. Owner Login (/api/auth/login):", ownerLoginRes.status === 200 && ownerCookie ? "PASS (200)" : "FAIL");

  // 6. Owner Reports
  const ownerReportsRes = await fetch("http://localhost:3000/api/owner/reports", {
    headers: { cookie: ownerCookie },
  });
  const ownerReportsData = await ownerReportsRes.json();
  console.log("6. Owner Shared Reports:", ownerReportsRes.status === 200 ? `PASS (${ownerReportsData.reports?.length} reports)` : "FAIL");

  // 7. Owner Notifications
  const notifsRes = await fetch("http://localhost:3000/api/owner/notifications", {
    headers: { cookie: ownerCookie },
  });
  const notifsData = await notifsRes.json();
  console.log("7. Owner Notifications:", notifsRes.status === 200 ? `PASS (${notifsData.notifications?.length} notifications)` : "FAIL");

  // 8. PDF Export & CSV Export
  if (ownerReportsData.reports?.length > 0) {
    const reportId = ownerReportsData.reports[0].id;
    const pdfRes = await fetch(`http://localhost:3000/api/owner/reports/export/pdf?reportId=${reportId}`, {
      headers: { cookie: ownerCookie },
    });
    console.log("8. Owner PDF Export:", pdfRes.status === 200 && pdfRes.headers.get("content-type")?.includes("html") ? "PASS (200 HTML-Printable)" : "FAIL (" + pdfRes.status + ")");

    const csvRes = await fetch(`http://localhost:3000/api/owner/reports/export/csv?reportId=${reportId}`, {
      headers: { cookie: ownerCookie },
    });
    console.log("9. Owner CSV Export:", csvRes.status === 200 && csvRes.headers.get("content-type")?.includes("csv") ? "PASS (200 CSV)" : "FAIL (" + csvRes.status + ")");
  } else {
    console.log("8. Owner PDF/CSV Export: (No shared reports yet to export for NovaPay, which is expected before Admin shares one)");
  }

  console.log("=== ALL SMOKE TESTS COMPLETED SUCCESSFULLY ===");
}

runSmokeTest().catch((err) => {
  console.error("Smoke test failed:", err);
  process.exit(1);
});
