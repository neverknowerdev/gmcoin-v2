"use client";

import Image from "next/image";
import { ConnectWallet } from "@coinbase/onchainkit/wallet";
import { DynamicConnectButton } from "@dynamic-labs/sdk-react-core";
import type { XProfile } from "@/types/social";

interface XVerificationScreenProps {
  title: string;
  description: string;
  address: string | undefined;
  authCode: string;
  tweetID: string;
  xConnection: XProfile | null;
  verificationStatus: {
    status: "pending" | "success" | "error";
    message?: string;
  } | null;
  verificationError: string | null;
  hash: string | undefined;
  isConfirmed: boolean;
  txError: Error | null;
  isPending: boolean;
  isMiniApp: boolean;
  codeCopied: boolean;
  onCopyCode: () => void;
  onTweetVerification: () => void;
  onVerifyTweet: () => void;
  onConnectX: () => void;
  onTweetIDChange: (value: string) => void;
}

export function XVerificationScreen({
  title,
  description,
  address,
  authCode,
  tweetID,
  xConnection,
  verificationStatus,
  verificationError,
  hash,
  isConfirmed,
  txError,
  isPending,
  isMiniApp,
  codeCopied,
  onCopyCode,
  onTweetVerification,
  onVerifyTweet,
  onConnectX,
  onTweetIDChange,
}: XVerificationScreenProps) {
  return (
    <>
      <div className="flex h-full w-full flex-col items-center justify-between px-6 py-8">
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
          <p className="mb-8 max-w-xs text-center text-base leading-relaxed text-gray-600">
            {description}
          </p>

          {/* Verification code input field */}
          {!address ? (
            <div className="mb-6 w-full max-w-xs rounded-lg bg-yellow-50 p-4 text-sm text-yellow-800">
              <p className="mb-2">Please connect your wallet first to generate verification code.</p>
              {isMiniApp ? (
                <ConnectWallet className="w-full rounded-lg bg-black px-4 py-2 text-sm font-normal text-white">
                  Connect Wallet
                </ConnectWallet>
              ) : (
                <DynamicConnectButton buttonClassName="w-full rounded-lg bg-black px-4 py-2 text-sm font-normal text-white">
                  Connect Wallet
                </DynamicConnectButton>
              )}
            </div>
          ) : (
            <div className="mb-6 w-full max-w-xs">
              <div className="relative rounded-2xl border-2 border-gray-200 bg-white p-4 shadow-lg">
                <label className="mb-2 block text-xs text-left font-medium text-gray-400">
                  Verification code
                </label>
                <div className="flex items-center justify-between">
                  <span
                    className="text-xl font-bold text-black break-all"
                    style={{ fontFamily: "var(--font-anton), sans-serif" }}
                  >
                    {authCode || "Generating..."}
                  </span>
                  <button
                    onClick={onCopyCode}
                    className="ml-4 flex-shrink-0 rounded-lg p-2 hover:bg-gray-100 transition"
                    title="Copy code"
                  >
                    {codeCopied ? (
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 20 20"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M16.6667 5L7.50004 14.1667L3.33337 10"
                          stroke="green"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    ) : (
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 20 20"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M13.3333 10.75V14.25C13.3333 15.9083 11.9917 17.25 10.3333 17.25H5.75C4.09167 17.25 2.75 15.9083 2.75 14.25V9.66667C2.75 8.00833 4.09167 6.66667 5.75 6.66667H9.25M13.3333 10.75H10.3333C9.14167 10.75 8.16667 9.775 8.16667 8.58333V5.58333C8.16667 4.39167 9.14167 3.41667 10.3333 3.41667H13.3333C14.525 3.41667 15.5 4.39167 15.5 5.58333V8.58333C15.5 9.775 14.525 10.75 13.3333 10.75Z"
                          stroke="black"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="mb-6 flex w-full max-w-xs flex-col gap-4">
            {/* Tweet verification button */}
            <button
              onClick={onTweetVerification}
              disabled={!authCode}
              className="flex w-full items-center justify-center gap-3 rounded-2xl bg-black px-6 py-4 text-base font-normal text-white transition hover:bg-black/90 disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wide"
              style={{ fontFamily: "var(--font-anton), sans-serif" }}
            >
              <Image
                src="/images/xIcon.svg"
                alt="X icon"
                width={20}
                height={20}
                className="brightness-0 invert"
              />
              <span>Tweet verification</span>
            </button>

            {/* Verify button */}
            <div className="w-full">
              <input
                type="text"
                value={tweetID}
                onChange={(e) => onTweetIDChange(e.target.value)}
                placeholder="Enter tweet ID"
                className="mb-3 w-full rounded-2xl border-2 border-gray-200 bg-white px-4 py-3 text-base text-black placeholder-gray-400 focus:border-black focus:outline-none"
              />
              <button
                onClick={onVerifyTweet}
                disabled={isPending || !tweetID.trim() || !xConnection || !address}
                className="flex w-full items-center justify-center rounded-2xl border-2 border-black bg-white px-6 py-4 text-base font-normal text-black transition hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wide"
                style={{ fontFamily: "var(--font-anton), sans-serif" }}
              >
                {isPending ? "Verifying..." : "I've tweeted, verify"}
              </button>
            </div>
          </div>

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
                href={`https://sepolia.basescan.org/tx/${hash}`}
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

          {/* Helper text */}
          <p className="text-center text-sm text-gray-500">
            Having issues? Paste tweet URL manually.
          </p>

          {/* Show connect X message if not connected */}
          {!xConnection && (
            <div className="mt-4 w-full max-w-xs rounded-lg bg-yellow-50 p-3 text-sm text-yellow-800">
              <p className="mb-2">Please connect your X account first.</p>
              <button
                onClick={onConnectX}
                className="w-full rounded-lg bg-black px-4 py-2 text-sm font-normal text-white"
                style={{ fontFamily: "var(--font-anton), sans-serif" }}
              >
                Connect X
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

