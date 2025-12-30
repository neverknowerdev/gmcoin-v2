"use client";

import Image from "next/image";
import { SignInButton, useSignIn } from "@farcaster/auth-kit";
import { useEffect } from "react";

interface FarcasterConfirmationScreenProps {
  title: string;
  description: string;
  isFarcasterConnected: boolean;
  farcasterProfile: { username?: string; fid?: number } | null;
  verificationStatus: {
    status: "pending" | "success" | "error";
    message?: string;
  } | null;
  verificationError: string | null;
  hash: string | undefined;
  isConfirmed: boolean;
  txError: Error | null;
  isPending: boolean;
  address: string | undefined;
  onConfirm: () => void;
  onConnectFarcaster: () => void;
}

export function FarcasterConfirmationScreen({
  title,
  description,
  isFarcasterConnected,
  farcasterProfile,
  verificationStatus,
  verificationError,
  hash,
  isConfirmed,
  txError,
  isPending,
  address,
  onConfirm,
  onConnectFarcaster,
}: FarcasterConfirmationScreenProps) {
  const signInState = useSignIn();
  const { data: farcasterAuthData } = signInState;

  // Helper function to extract FID from message or error
  const extractFid = (msg: any, err: any): string | null => {
    if (msg?.fid) return String(msg.fid);
    if (msg?.data?.fid) return String(msg.data.fid);
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
    if (farcasterAuthData && !isFarcasterConnected) {
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
            onConnectFarcaster();
          }
        })
        .catch((error) => {
          console.error("Failed to store Farcaster profile:", error);
        });
    }
  }, [farcasterAuthData, isFarcasterConnected, onConnectFarcaster]);

  return (
    <>
      <div className="flex h-full w-full flex-col items-center justify-center px-6 py-8">
        {/* Farcaster Logo */}
        <div className="mb-8 flex justify-center">
          <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-white shadow-lg">
            <Image
              src="/images/farcasterIcon.svg"
              alt="Farcaster logo"
              width={60}
              height={60}
              className="brightness-0"
            />
          </div>
        </div>

        {/* Heading */}
        <h1
          className="mb-4 text-center text-3xl font-normal text-black sm:text-4xl"
          style={{ fontFamily: "var(--font-anton), sans-serif" }}
        >
          {title}
        </h1>

        {/* Description */}
        {description && (
          <p className="mb-12 max-w-xs text-center text-base leading-relaxed text-black">
            {description}
          </p>
        )}

        {/* Status messages */}
        {verificationStatus && (
          <div
            className={`mb-4 w-full max-w-xs rounded-lg p-3 text-sm ${
              verificationStatus.status === "success"
                ? "bg-green-100 text-green-800"
                : verificationStatus.status === "error"
                ? "bg-red-100 text-red-800"
                : "bg-blue-100 text-blue-800"
            }`}
          >
            {verificationStatus.message}
          </div>
        )}

        {verificationError && (
          <div className="mb-4 w-full max-w-xs rounded-lg bg-red-100 p-3 text-sm text-red-800">
            {verificationError}
          </div>
        )}

        {hash && (
          <div className="mb-4 w-full max-w-xs rounded-lg bg-blue-100 p-3 text-sm text-blue-800">
            <p className="font-semibold">Transaction submitted!</p>
            <a
              href={`https://basescan.org/tx/${hash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs underline"
            >
              View on BaseScan →
            </a>
            {isConfirmed && !verificationStatus && (
              <p className="mt-2 text-xs">Transaction confirmed! Waiting for verification...</p>
            )}
          </div>
        )}

        {txError && (
          <div className="mb-4 w-full max-w-xs rounded-lg bg-red-100 p-3 text-sm text-red-800">
            Transaction error: {txError.message || String(txError)}
          </div>
        )}

        {/* Confirm button */}
        <div className="w-full max-w-xs">
          {!address ? (
            <div className="w-full rounded-lg bg-yellow-50 p-4 text-sm text-yellow-800">
              <p className="mb-2">Please connect your wallet first.</p>
            </div>
          ) : isFarcasterConnected && farcasterProfile ? (
            <button
              onClick={onConfirm}
              disabled={isPending || verificationStatus?.status === "pending" || verificationStatus?.status === "success"}
              className="w-full cursor-pointer rounded-2xl bg-black px-6 py-4 text-base font-normal text-white transition hover:bg-black/90 disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wide"
              style={{ fontFamily: "var(--font-anton), sans-serif" }}
            >
              {isPending || verificationStatus?.status === "pending" 
                ? "Verifying..." 
                : verificationStatus?.status === "success"
                ? "Verified!"
                : "Confirm & Verify"}
            </button>
          ) : (
            <div className="w-full rounded-lg bg-yellow-50 p-4 text-sm text-yellow-800">
              <p className="mb-2">Please connect your Farcaster account first.</p>
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
                  const extractedFid = extractFid(signInState.message, error);
                  
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
            </div>
          )}
        </div>
      </div>
    </>
  );
}

