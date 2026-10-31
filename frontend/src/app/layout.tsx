import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "PortaFact | Autonomous RWA Factoring & Default-Insured Tranche Vault",
  description:
    "Enterprise accounts receivable factoring powered by Portaldot V3.0 EVM and Layer-0 Default-as-a-Service",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-background text-gray-100 antialiased">{children}</body>
    </html>
  );
}