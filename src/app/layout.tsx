import type { Metadata } from "next";
import { Poppins, Teko } from "next/font/google";
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
  title: "NHL Predictions | Daily Game Predictions & Analysis",
  description:
    "AI-powered NHL game predictions with betting analysis, player props, and detailed matchup breakdowns.",
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
      </body>
    </html>
  );
}
