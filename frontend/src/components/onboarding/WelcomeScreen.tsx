"use client";

import Image from "next/image";
import { ConnectWallet } from "@coinbase/onchainkit/wallet";
import { DynamicConnectButton } from "@dynamic-labs/sdk-react-core";

interface WelcomeScreenProps {
  title: string;
  description: string;
  isConnected: boolean;
  isMiniApp: boolean;
  onNext: () => void;
  hasNext: boolean;
}

export function WelcomeScreen({
  title,
  description,
  isConnected,
  isMiniApp,
  onNext,
  hasNext,
}: WelcomeScreenProps) {
  return (
    <>
      <div className="flex w-full flex-1 flex-col items-center justify-center">
        {/* Mascot container with speech bubble */}
        <div className="relative mb-6 flex w-full max-w-sm flex-col items-center">
          {/* Mascot */}
          <div className="relative">
            <Image
              src="/images/mascot1.svg"
              alt="GM mascot"
              width={240}
              height={240}
              priority
              className="drop-shadow-xl"
            />
          </div>
        </div>

        {/* Heading */}
        <h1
          className="mb-3 text-5xl font-normal text-black sm:text-6xl"
          style={{ fontFamily: "var(--font-anton), sans-serif" }}
        >
          {title}
        </h1>

        {/* Description */}
        {description && (
          <p className="mb-8 text-center text-black text-sm leading-relaxed max-w-[230px] mx-auto">
            {description}
          </p>
        )}
      </div>

      {/* Get started button at bottom */}
      <div className="w-full pb-8">
        <div className="mx-auto w-full max-w-xs">
          {!isConnected ? (
            <>
              {/* Show wallet connection buttons if not connected */}
              {isMiniApp ? (
                <ConnectWallet className="w-full cursor-pointer rounded-full bg-black px-6 py-4 text-base font-normal text-white transition hover:bg-black/90 uppercase tracking-wide">
                  Get started
                </ConnectWallet>
              ) : (
                <DynamicConnectButton buttonClassName="w-full cursor-pointer rounded-full bg-black px-6 py-4 text-base font-normal text-white transition hover:bg-black/90 uppercase tracking-wide">
                  Get started
                </DynamicConnectButton>
              )}
            </>
          ) : (
            <>
              {/* Show next button if wallet is connected */}
              {hasNext ? (
                <button
                  onClick={onNext}
                  className="w-full cursor-pointer rounded-2xl bg-black px-6 py-4 text-base font-normal text-white transition hover:bg-black/90 uppercase tracking-wide"
                  style={{ fontFamily: "var(--font-anton), sans-serif" }}
                >
                  Get started
                </button>
              ) : (
                <>
                  {isMiniApp ? (
                    <ConnectWallet className="w-full cursor-pointer rounded-2xl bg-black px-6 py-4 text-base font-semibold text-white transition hover:bg-black/90">
                      Connect Wallet
                    </ConnectWallet>
                  ) : (
                    <DynamicConnectButton buttonClassName="w-full cursor-pointer rounded-2xl bg-black px-6 py-4 text-base font-semibold text-white transition hover:bg-black/90">
                      Connect Wallet
                    </DynamicConnectButton>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

