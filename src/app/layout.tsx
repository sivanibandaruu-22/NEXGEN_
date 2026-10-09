import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kampus.VC | Digital Risk Protection Platform",
  description: "Enterprise Digital Risk Protection: Proactive Brand Impersonation, Social Media, App Store, and Look-alike Name Threat Intelligence.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-charcoal-700 selection:bg-butter-300 selection:text-charcoal-900 antialiased">
        {children}
      </body>
    </html>
  );
}
