import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: {
    default: "LogPilot — Digital FMCSA Driver Daily Log",
    template: "%s · LogPilot",
  },
  description:
    "LogPilot replaces the paper Driver's Daily Log with a beautiful, compliance-first Hours of Service platform. Interactive timeline, live FMCSA validation, and pixel-perfect printable logs.",
  applicationName: "LogPilot",
  authors: [{ name: "LogPilot" }],
  keywords: [
    "FMCSA",
    "Hours of Service",
    "Driver Daily Log",
    "ELD",
    "Trucking compliance",
  ],
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0f1c" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
