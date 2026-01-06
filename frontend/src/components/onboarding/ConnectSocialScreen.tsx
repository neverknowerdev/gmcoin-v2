"use client";

import Image from "next/image";
import { SignInButton, useSignIn } from "@farcaster/auth-kit";
import { useEffect } from "react";

interface ConnectSocialScreenProps {
  title: string;
  description: string;
  onConnectX: () => void;
  onConnectFarcaster: () => void;
  farcasterConnection?: { fid: number; username?: string } | null;
}

export function ConnectSocialScreen({
  title,
  description,
  onConnectX,
  onConnectFarcaster,
  farcasterConnection,
}: ConnectSocialScreenProps) {
  const signInState = useSignIn({});
  const { data: farcasterAuthData } = signInState;

  // Helper function to extract FID from error
  const extractFid = (err: any): string | null => {
    if (err) {
      const errorString = err?.message || err?.toString() || "";
      const fidMatch = errorString.match(/args:\s*\((\d+),/);
      if (fidMatch && fidMatch[1]) {
        return fidMatch[1];
      }
    }
    return null;
  };

  // Store profile when we get it from useSignIn data (works even if verification fails)
  useEffect(() => {
    if (farcasterAuthData && !farcasterConnection) {
      const { fid, username, displayName, pfpUrl } = farcasterAuthData;
      
      fetch("/api/farcaster/store", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fid,
          username,
          displayName,
          pfpUrl,
        }),
      })
        .then(async (response) => {
          if (response.ok) {
            // Call the callback to notify parent component
            onConnectFarcaster();
          }
        })
        .catch((error) => {
          console.error("Failed to store Farcaster profile:", error);
        });
    }
  }, [farcasterAuthData, farcasterConnection, onConnectFarcaster]);

  return (
    <>
      <div className="flex h-full w-full flex-col items-center justify-between px-6 py-8">
        {/* Coin image at top */}
        <div className="mt-8 flex justify-center">
          <Image
            src="/images/coinFace.svg"
            alt="GM Coin"
            width={200}
            height={200}
            priority
            className="drop-shadow-xl"
          />
        </div>

        {/* Content section */}
        <div className="flex w-full flex-1 flex-col items-center justify-center">
          {/* Heading */}
          <h1
            className="mb-3 text-3xl font-normal text-black sm:text-4xl"
            style={{ fontFamily: "var(--font-anton), sans-serif" }}
          >
            {title}
          </h1>

          {/* Description */}
          {description && (
            <p className="mb-8 max-w-xs text-center text-base leading-relaxed text-gray-600">
              {description}
            </p>
          )}

          {/* Connect buttons */}
          <div className="mb-6 flex w-full max-w-xs flex-col gap-4">
            {/* Connect X button */}
            <button
              onClick={onConnectX}
              className="flex w-full items-center justify-center gap-3 rounded-full bg-black px-6 py-3 text-base font-normal text-white transition hover:bg-black/90"
            >
              <Image
                src="/images/xIcon.svg"
                alt="X icon"
                width={20}
                height={20}
                className="brightness-0 invert"
              />
              <span style={{ fontFamily: "var(--font-anton), sans-serif" }}>
                Connect X
              </span>
            </button>

            {/* Connect Farcaster button - using SignInButton */}
            {farcasterConnection ? (
              <div className="flex w-full items-center justify-center gap-3 rounded-full bg-[#84D65B] px-6 py-3 text-base font-medium text-black">
                <Image
                  src="/images/farcasterIcon.svg"
                  alt="Farcaster icon"
                  width={20}
                  height={20}
                  className="brightness-0"
                />
                <span style={{ fontFamily: "var(--font-anton), sans-serif" }}>
                  ✓ Connected
                </span>
              </div>
            ) : (
              <SignInButton
                onSuccess={async ({ fid, username, displayName, pfpUrl }) => {
                  try {
                    const response = await fetch("/api/farcaster/store", {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                      },
                      body: JSON.stringify({
                        fid,
                        username,
                        displayName,
                        pfpUrl,
                      }),
                    });

                    if (response.ok) {
                      onConnectFarcaster();
                    }
                  } catch (error) {
                    console.error("Failed to store Farcaster profile:", error);
                  }
                }}
                onError={async (error) => {
                  // Extract FID from error and fetch profile
                  const extractedFid = extractFid(error);
                  
                  if (extractedFid) {
                    try {
                      const profileResponse = await fetch(`/api/farcaster/fetch-profile?fid=${extractedFid}`);
                      
                      if (profileResponse.ok) {
                        const { profile } = await profileResponse.json();
                        
                        const storeResponse = await fetch("/api/farcaster/store", {
                          method: "POST",
                          headers: {
                            "Content-Type": "application/json",
                          },
                          body: JSON.stringify({
                            fid: profile.fid,
                            username: profile.username,
                            displayName: profile.displayName,
                            pfpUrl: profile.pfpUrl,
                          }),
                        });
                        
                        if (storeResponse.ok) {
                          onConnectFarcaster();
                        }
                      }
                    } catch (fetchError) {
                      console.error("Error fetching/storing profile:", fetchError);
                    }
                  }
                }}
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
}

