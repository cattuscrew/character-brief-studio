import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Character Brief Studio",
  description: "Build clear game character and creature art briefs without needing specialist vocabulary.",
  other: {
      "codex-preview": "character-brief-studio",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
