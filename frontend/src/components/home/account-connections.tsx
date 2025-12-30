"use client";

import Image from "next/image";
import { useEffect } from "react";
import type { XProfile, FarcasterProfile } from "@/types/social";
import { CoinbaseVerificationButton } from "@/components/coinbase-verification-button";
import { SignInButton, useSignIn } from "@farcaster/auth-kit";

interface AccountConnectionsProps {
  xConnection: XProfile | null;
  farcasterConnection: FarcasterProfile | null;
  onConnectX: () => void;
  onDisconnectX?: () => void;
  onDisconnectFarcaster?: () => void;
}

export function AccountConnections({
  xConnection,
  farcasterConnection,
  onConnectX,
  onDisconnectX,
  onDisconnectFarcaster,
}: AccountConnectionsProps) {
  // Use useSignIn to get profile data even if verification fails
  const signInState = useSignIn();
  const { data: farcasterAuthData, isSuccess, isError, error, message, fid } = signInState;

  // Helper function to extract FID from message or error
  const extractFid = (msg: any, err: any): string | null => {
    // Try to get FID from message if available
    if (msg?.fid) return String(msg.fid);
    if (msg?.data?.fid) return String(msg.data.fid);
    
    // Try to extract from error message
    if (err) {
      const errorString = err?.message || err?.toString() || "";
      const fidMatch = errorString.match(/args:\s*\((\d+),/);
      if (fidMatch && fidMatch[1]) {
        return fidMatch[1];
      }
    }
    
    return null;
  };

  // Debug logging - log entire signInState to see what's available
  useEffect(() => {
    console.log("🔍 useSignIn full state:", signInState);
    console.log("🔍 useSignIn extracted:", {
      hasData: !!farcasterAuthData,
      data: farcasterAuthData,
      message,
      fid,
      isSuccess,
      isError,
      error,
      extractedFid: extractFid(message, error),
    });
  }, [signInState, farcasterAuthData, message, fid, isSuccess, isError, error]);

  // Store profile when we get it from useSignIn data (works even if verification fails)
  useEffect(() => {
    if (farcasterAuthData && !farcasterConnection) {
      const { fid, username, displayName, pfpUrl } = farcasterAuthData;
      console.log("✅ Storing Farcaster profile from useSignIn data:", { fid, username });
      
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
            console.log("✅ Profile stored successfully");
            setTimeout(() => {
              window.location.reload();
            }, 500);
          } else {
            const errorText = await response.text();
            console.error("❌ Failed to store profile:", errorText);
          }
        })
        .catch((error) => {
          console.error("❌ Failed to store Farcaster profile:", error);
        });
    }
  }, [farcasterAuthData, farcasterConnection]);

  return (
    <div className="mx-4 mb-4 space-y-3">
      {/* X Connection Card */}
      <div className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-white border border-gray-200">
          <Image
            src="/images/xIcon.svg"
            alt="X icon"
            width={24}
            height={24}
            className="brightness-0"
          />
        </div>
        <div className="flex-1">
          <h3 className="text-base font-semibold text-black">Connect X</h3>
          <p className="text-xs text-gray-500">Link your X account</p>
        </div>
        {xConnection ? (
          <button
            onClick={onDisconnectX}
            className="flex-shrink-0 rounded-full bg-[#84D65B] px-4 py-2 hover:bg-[#6fb84a] transition"
            title="Click to disconnect"
          >
            <span className="text-sm font-medium text-black">✓ Connected</span>
          </button>
        ) : (
          <button
            onClick={onConnectX}
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border-2 border-gray-300 bg-white transition hover:bg-gray-50"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M10 4V16M4 10H16"
                stroke="black"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Farcaster Connection Card */}
      <div className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-white border border-gray-200">
          <Image
            src="/images/farcasterIcon.svg"
            alt="Farcaster icon"
            width={24}
            height={24}
            className="brightness-0"
          />
        </div>
        <div className="flex-1">
          <h3 className="text-base font-semibold text-black">Connect Farcaster</h3>
          <p className="text-xs text-gray-500">Link your Farcaster account</p>
        </div>
        {farcasterConnection ? (
          <button
            onClick={onDisconnectFarcaster}
            className="flex-shrink-0 rounded-full bg-[#84D65B] px-4 py-2 hover:bg-[#6fb84a] transition"
            title="Click to disconnect"
          >
            <span className="text-sm font-medium text-black">✓ Connected</span>
          </button>
        ) : (
          <SignInButton
            onSuccess={async ({ fid, username, displayName, pfpUrl }) => {
              console.log("✅ SignInButton onSuccess called:", { fid, username });
              // Store profile in cookie after successful sign-in
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
                  console.log("✅ Profile stored via onSuccess");
                  setTimeout(() => {
                    window.location.reload();
                  }, 500);
                } else {
                  const errorText = await response.text();
                  console.error("❌ Failed to store profile via onSuccess:", errorText);
                }
              } catch (error) {
                console.error("❌ Failed to store Farcaster profile:", error);
              }
            }}
            onError={async (error) => {
              console.error("❌ SignInButton onError:", error);
              
              // Extract FID from error message or sign-in message
              const extractedFid = extractFid(message, error);
              
              if (extractedFid) {
                console.log("🔍 Extracted FID:", extractedFid);
                
                try {
                  // Fetch profile from Farcaster API
                  const profileResponse = await fetch(`/api/farcaster/fetch-profile?fid=${extractedFid}`);
                  
                  if (profileResponse.ok) {
                    const { profile } = await profileResponse.json();
                    console.log("✅ Fetched profile from API:", profile);
                    
                    // Store the profile
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
                      console.log("✅ Profile stored after verification error");
                      setTimeout(() => {
                        window.location.reload();
                      }, 500);
                    } else {
                      const errorText = await storeResponse.text();
                      console.error("❌ Failed to store profile:", errorText);
                    }
                  } else {
                    const errorText = await profileResponse.text();
                    console.error("❌ Failed to fetch profile from API:", errorText);
                  }
                } catch (fetchError) {
                  console.error("❌ Error fetching/storing profile:", fetchError);
                }
              } else {
                console.log("⚠️ Could not extract FID from error or message");
              }
            }}
          />
        )}
      </div>

      {/* Coinbase Verification Card */}
      <CoinbaseVerificationButton />
    </div>
  );
}

