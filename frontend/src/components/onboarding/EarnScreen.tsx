"use client";

import Image from "next/image";
import { ConnectWallet } from "@coinbase/onchainkit/wallet";
import { DynamicConnectButton } from "@dynamic-labs/sdk-react-core";

interface EarnScreenProps {
  title: string;
  highlightText: string;
  description: string;
  buttonText: string;
  isMiniApp: boolean;
  onNext: () => void;
  hasNext: boolean;
}

export function EarnScreen({
  title,
  highlightText,
  description,
  buttonText,
  isMiniApp,
  onNext,
  hasNext,
}: EarnScreenProps) {
  return (
    <>
      <div className="relative flex h-full w-full flex-col items-center justify-between overflow-hidden">
        {/* Illustrations section - bird */}
        <div className="mt-10">
          <Image
            src="/images/bird.svg"
            alt="Blue bird mascot"
            width={300}
            height={300}
            className="drop-shadow-xl"
          />
        </div>

        {/* Content section */}
        <div className="relative z-20 flex w-full flex-1 flex-col items-center justify-center px-6">
          {/* Heading */}
          <h1
            className="mb-4 text-2xl font-normal text-black"
            style={{ fontFamily: "var(--font-anton), sans-serif" }}
          >
            {title}
          </h1>

          {/* Yellow highlight box */}
          {highlightText && (
            <div className="mb-4 rounded-full bg-[#E8EE58] px-5 py-2 shadow-lg">
              <p className="text-base font-medium text-black sm:text-lg">
                {highlightText}
              </p>
            </div>
          )}

          {/* Description */}
          {description && (
            <p className="max-w-xs text-center text-base leading-relaxed text-black sm:text-lg">
              {description}
            </p>
          )}
        </div>

        {/* Try Now button at bottom */}
        <div className="relative z-20 w-full pb-8">
          <div className="mx-auto w-full max-w-xs">
            {hasNext ? (
              <button
                onClick={onNext}
                className="w-full cursor-pointer rounded-2xl bg-black px-6 py-4 text-base font-normal text-white transition hover:bg-black/90 uppercase tracking-wide"
                style={{ fontFamily: "var(--font-anton), sans-serif" }}
              >
                {buttonText || "Next"}
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
          </div>
        </div>
      </div>
    </>
  );
}

