import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Communication Dashboard",
  description: "Unified communication monitoring for Danny — email and WhatsApp action tracking.",
};

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
