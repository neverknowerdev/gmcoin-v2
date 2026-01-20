"use client";

import { useCoinbaseVerification } from "@/hooks/useCoinbaseVerification";
import { useState } from "react";

interface CoinbaseVerificationButtonProps {
  className?: string;
  variant?: "light" | "dark";
  fullWidth?: boolean;
}

export function CoinbaseVerificationButton({
  className = "",
  variant = "dark",
  fullWidth = false,
}: CoinbaseVerificationButtonProps) {
  const {
    isCoinbaseVerified,
    isLoading,
    error,
    requestCoinbaseVerification,
    isEmbeddedWallet,
  } = useCoinbaseVerification();

  const [showInstructions, setShowInstructions] = useState(false);

  const handleClick = async () => {
    if (isCoinbaseVerified) {
      // Already verified, show info or do nothing
      return;
    }

    // Show instructions first
    setShowInstructions(true);
    
    // After a delay, open Coinbase verification page
    setTimeout(() => {
      window.open("https://www.coinbase.com/onchain-verify", "_blank");
    }, 1000);
  };

  const handleVerify = async () => {
    setShowInstructions(false);
    await requestCoinbaseVerification();
  };

  if (isCoinbaseVerified) {
    return (
      <div className={`flex items-center gap-2 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm ${className}`}>
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-white border border-gray-200">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M12 2L2 7L12 12L22 7L12 2Z"
              fill="#0052FF"
            />
            <path
              d="M2 17L12 22L22 17"
              stroke="#0052FF"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M2 12L12 17L22 12"
              stroke="#0052FF"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div className="flex-1">
          <h3 className="text-base font-semibold text-black">Coinbase Verified</h3>
          <p className="text-xs text-gray-500">Your wallet is verified by Coinbase</p>
        </div>
        <div className="flex-shrink-0 rounded-full bg-[#84D65B] px-4 py-2">
          <span className="text-sm font-medium text-black">✓ Verified</span>
        </div>
      </div>
    );
  }

  if (showInstructions) {
    return (
      <div className={`rounded-2xl border border-gray-200 bg-white p-6 shadow-sm ${className}`}>
        <h3 className="text-lg font-semibold text-black mb-4">Verify with Coinbase</h3>
        <div className="space-y-3 mb-4">
          <p className="text-sm text-gray-600">
            1. A new tab will open to Coinbase verification page
          </p>
          <p className="text-sm text-gray-600">
            2. Sign in to your Coinbase account
          </p>
          {isEmbeddedWallet ? (
            <>
              <p className="text-sm text-gray-600">
                3. On Coinbase, when asked to connect your wallet:
              </p>
              <ul className="list-disc list-inside ml-4 space-y-1 text-sm text-gray-600">
                <li>Look for &quot;WalletConnect&quot; or &quot;Dynamic&quot; option</li>
                <li>Or use the &quot;Export Wallet&quot; feature in your wallet settings to get your private key</li>
                <li>Import it into MetaMask or another wallet that Coinbase supports</li>
                <li>Then connect that wallet to Coinbase</li>
              </ul>
              <p className="text-sm text-gray-600">
                4. Complete the verification process on Coinbase
              </p>
              <p className="text-sm text-gray-600">
                5. Come back here and click &quot;Verify&quot; below
              </p>
            </>
          ) : (
            <>
              <p className="text-sm text-gray-600">
                3. Connect your wallet (make sure it&apos;s the same wallet you&apos;re using here)
              </p>
              <p className="text-sm text-gray-600">
                4. Complete the verification process on Coinbase
              </p>
              <p className="text-sm text-gray-600">
                5. Come back here and click &quot;Verify&quot; below
              </p>
            </>
          )}
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowInstructions(false)}
            className="flex-1 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-black hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleVerify}
            disabled={isLoading}
            className="flex-1 rounded-xl bg-black px-4 py-2 text-sm font-medium text-white hover:bg-neutral-900 disabled:opacity-50"
          >
            {isLoading ? "Verifying..." : "Verify"}
          </button>
        </div>
        {error && (
          <p className="mt-3 text-sm text-red-600">{error}</p>
        )}
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm ${className}`}>
      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-white border border-gray-200">
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M12 2L2 7L12 12L22 7L12 2Z"
            fill="#0052FF"
          />
          <path
            d="M2 17L12 22L22 17"
            stroke="#0052FF"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M2 12L12 17L22 12"
            stroke="#0052FF"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <div className="flex-1">
        <h3 className="text-base font-semibold text-black">Verify by Coinbase</h3>
        <p className="text-xs text-gray-500">Prove you&apos;re a real person</p>
      </div>
      <button
        onClick={handleClick}
        disabled={isLoading}
        className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border-2 border-gray-300 bg-white transition hover:bg-gray-50 disabled:opacity-50 ${
          fullWidth ? "w-full" : ""
        }`}
      >
        {isLoading ? (
          <svg
            className="animate-spin h-5 w-5 text-black"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
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
              d="M10 4V16M4 10H16"
              stroke="black"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        )}
      </button>
      {error && (
        <p className="text-xs text-red-600 mt-1">{error}</p>
      )}
    </div>
  );
}
