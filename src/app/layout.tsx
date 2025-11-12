import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://basefriends.vercel.app"),
  title: "BaseFriends - Meet Builders on Base",
  description: "Connect with like-minded builders and expand your network on Base. Swipe, match, and grow your Farcaster community.",
  keywords: ["Base", "Farcaster", "Networking", "Builders", "Social"],
  authors: [{ name: "BaseFriends" }],
  creator: "BaseFriends",
  publisher: "BaseFriends",
  icons: {
    icon: [
      { url: "/icon.png", sizes: "512x512", type: "image/png" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: [
      { url: "/icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: process.env.NEXT_PUBLIC_APP_URL || "https://basefriends.vercel.app",
    siteName: "BaseFriends",
    title: "BaseFriends - Meet Builders on Base",
    description: "Connect with like-minded builders and expand your network on Base. Swipe, match, and grow your Farcaster community.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "BaseFriends - Meet Builders on Base",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "BaseFriends - Meet Builders on Base",
    description: "Connect with like-minded builders and expand your network on Base.",
    images: ["/og-image.png"],
    creator: "@basefriends",
  },
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
