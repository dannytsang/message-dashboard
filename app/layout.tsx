import type { Metadata } from "next";
import Navigation from "@/components/Navigation";
import "./globals.css";

export const metadata: Metadata = {
  title: "Communication Dashboard",
  description: "Unified communication monitoring for Danny — email and WhatsApp action tracking.",
};

// NOTE: Navigation is rendered per-page (not here) so it receives the correct
// per-request effective mode from each page's server component.
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
