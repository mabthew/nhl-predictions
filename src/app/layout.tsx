import type { Metadata } from "next";
import { Poppins, Teko } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const teko = Teko({
  variable: "--font-teko",
  subsets: ["latin"],
  weight: ["600", "700"],
});

export const metadata: Metadata = {
  title: "DegenHL | NHL Game Predictions & Analysis",
  description:
    "Daily NHL game picks, over/under predictions, and player props with detailed matchup breakdowns.",
  metadataBase: new URL("https://degenhl.com"),
  openGraph: {
    title: "DegenHL | NHL Game Predictions",
    description:
      "Daily NHL picks, over/under predictions, and player props with detailed matchup breakdowns.",
    siteName: "DegenHL",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "DegenHL | NHL Game Predictions",
    description:
      "Daily NHL picks, over/under predictions, and player props.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${poppins.variable} ${teko.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-poppins">
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
