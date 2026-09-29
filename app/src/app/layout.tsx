import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { Nav } from "@/components/Nav";
import { Providers } from "@/components/Providers";

import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Monthly — recurring payments on Solana",
  description:
    "Direct debit for USDC. Subscribers approve a mandate once; the program pulls the plan amount when it is due.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <Providers>
          <Nav />
          <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">{children}</main>
          <footer className="border-t border-line">
            <div className="mx-auto flex max-w-6xl flex-wrap justify-between gap-2 px-4 py-5 text-xs text-muted">
              <span>Monthly · recurring payments on Solana · devnet MVP</span>
              <span className="flex gap-4">
                <a
                  className="hover:text-fg"
                  href="https://explorer.solana.com/address/6F6a5BMjLyy7rXRcgZf9vwSqsVxJ34d1Xvov4gBsMhcQ?cluster=devnet"
                  target="_blank"
                  rel="noreferrer"
                >
                  Program on explorer
                </a>
                <a className="hover:text-fg" href="https://github.com/pottprvt/monthly" target="_blank" rel="noreferrer">
                  Source on GitHub
                </a>
              </span>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
