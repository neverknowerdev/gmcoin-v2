import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Anton } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { DynamicWrapper } from "./dynamicWrapper";
import { NavBar } from "@/components/nav-bar";
import { PreloadSequence } from "@/components/preload-sequence";
import { OnboardingScreen } from "@/components/onboarding-screen";
import { Header } from "@/components/home/header";
import { MiniKitContextProvider } from "./miniKitProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const anton = Anton({
  variable: "--font-anton",
  weight: "400",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export async function generateMetadata(): Promise<Metadata> {
  const appUrl = process.env.NEXT_PUBLIC_URL || "https://murujb-ip-102-89-75-118.tunnelmole.net";
  return {
    title: process.env.NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME || "GMcoin Mini App",
    description:
      process.env.NEXT_PUBLIC_APP_DESCRIPTION || "Social-native crypto portfolio tracker for Base Mini Apps, built with MiniKit and OnchainKit.",
    metadataBase: new URL(appUrl),
    openGraph: {
      title: process.env.NEXT_PUBLIC_APP_OG_TITLE || "GMcoin Mini App",
      description: process.env.NEXT_PUBLIC_APP_OG_DESCRIPTION || "Track, compare, and act on your Base assets instantly.",
      url: appUrl,
      siteName: process.env.NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME || "GMcoin Mini App",
      images: [
        {
          url: process.env.NEXT_PUBLIC_APP_OG_IMAGE || "/og.png",
          width: 1200,
          height: 630,
          alt: "GMcoin Mini App preview",
        },
      ],
    },
    category: process.env.NEXT_PUBLIC_APP_PRIMARY_CATEGORY || "finance",
    keywords: [
      "gmcoin",
      "mini app",
      "base",
      "onchainkit",
      "portfolio tracker",
    ],
    other: {
      "fc:frame": JSON.stringify({
        version: "next",
        imageUrl: process.env.NEXT_PUBLIC_APP_HERO_IMAGE || `${appUrl}/hero.png`,
        button: {
          title: `Launch ${process.env.NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME || "GMcoin"}`,
          action: {
            type: "launch_frame",
            name: process.env.NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME || "GMcoin",
            url: appUrl,
            splashImageUrl: process.env.NEXT_PUBLIC_APP_SPLASH_IMAGE || process.env.NEXT_PUBLIC_SPLASH_IMAGE || `${appUrl}/splash.png`,
            splashBackgroundColor:
              process.env.NEXT_PUBLIC_SPLASH_BACKGROUND_COLOR || "#ffffff",
          },
        },
      }),
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${anton.variable} text-foreground antialiased`}
      >
        <MiniKitContextProvider>
          <Providers>
            <DynamicWrapper>
              <PreloadSequence>
                <OnboardingScreen>
                  <div className="min-h-screen bg-white">
                    <Header />
                    <div className="pb-10">{children}</div>
                    <NavBar />
                  </div>
                </OnboardingScreen>
              </PreloadSequence>
            </DynamicWrapper>
          </Providers>
        </MiniKitContextProvider>
      </body>
    </html>
  );
}
