import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Link from "next/link";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DomainFlames 🔥",
  description: "Search domain availability, pricing, WHOIS, and alternatives.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-background text-foreground`}>
        <div className="w-full border-b">
          <div className="container mx-auto max-w-4xl px-4 py-4">
            <Link href="/" className="font-semibold text-lg" aria-label="Home">
              DomainFlames 🔥
            </Link>
          </div>
        </div>
        {children}
      </body>
    </html>
  );
}
