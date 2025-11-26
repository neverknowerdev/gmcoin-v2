import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { DynamicWrapper } from "./dynamicWrapper";
import { NavBar } from "@/components/nav-bar";
import { PreloadSequence } from "@/components/preload-sequence";
import { OnboardingScreen } from "@/components/onboarding-screen";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GMcoin Mini App",
  description:
    "Social-native crypto portfolio tracker for Base Mini Apps, built with MiniKit and OnchainKit.",
  metadataBase: new URL("https://gmcoin.example.com"),
  openGraph: {
    title: "GMcoin Mini App",
    description: "Track, compare, and act on your Base assets instantly.",
    url: "https://gmcoin.example.com",
    siteName: "GMcoin Mini App",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "GMcoin Mini App preview",
      },
    ],
  },
  category: "finance",
  keywords: [
    "gmcoin",
    "mini app",
    "base",
    "onchainkit",
    "portfolio tracker",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} text-foreground antialiased`}
      >
        <Providers>
          <DynamicWrapper>
            <PreloadSequence>
              <OnboardingScreen>
                <div className="min-h-screen pb-32">{children}</div>
                <NavBar />
              </OnboardingScreen>
            </PreloadSequence>
          </DynamicWrapper>
        </Providers>
      </body>
    </html>
  );
}
