import { Analytics } from "@vercel/analytics/next";
import type { Metadata, Viewport } from "next";
import { Fira_Code, Inter } from "next/font/google";
import { Shell } from "@/components/shell";
import "./globals.css";

// Deepgram's site sets body text in Inter and code in Fira Code; headings are Roobert (globals.css).
const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const fira = Fira_Code({ variable: "--font-fira", subsets: ["latin"], weight: ["400", "500"] });

export const metadata: Metadata = {
  title: { default: "Turn by Turn: a Deepgram Playground concept", template: "%s · Turn by Turn" },
  description:
    "A Voice Agent playground concept that makes real time visible: per-turn latency waterfalls, a tunable Flux end-of-turn threshold, barge-in, an event inspector and code from your config. By Hafsa Usmani for Deepgram's Product Designer II role.",
  metadataBase: new URL("https://deepgram-demo-kappa.vercel.app"),
};

export const viewport: Viewport = { themeColor: "#0b0b0c", colorScheme: "dark" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${fira.variable} antialiased`}>
      <body className="font-sans">
        <Shell>{children}</Shell>
        <Analytics />
      </body>
    </html>
  );
}
