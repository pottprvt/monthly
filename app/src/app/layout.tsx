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
          <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
          <footer className="border-t border-line py-4 text-center text-xs text-muted">
            Program{" "}
            <a
              className="font-mono underline-offset-2 hover:underline"
              href="https://explorer.solana.com/address/6F6a5BMjLyy7rXRcgZf9vwSqsVxJ34d1Xvov4gBsMhcQ?cluster=devnet"
              target="_blank"
              rel="noreferrer"
            >
              6F6a…MhcQ
            </a>{" "}
            on devnet ·{" "}
            <a className="underline-offset-2 hover:underline" href="https://github.com/pottprvt/monthly" target="_blank" rel="noreferrer">
              source
            </a>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
