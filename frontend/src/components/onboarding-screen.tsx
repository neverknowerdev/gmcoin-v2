"use client";

import Image from "next/image";
import { PropsWithChildren, useCallback, useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { useWalletConnection } from "@/hooks/useWalletConnection";
import { useMiniKit } from "@coinbase/onchainkit/minikit";
import { ConnectWallet } from "@coinbase/onchainkit/wallet";
import { DynamicConnectButton } from "@dynamic-labs/sdk-react-core";

const SLIDES = [
  {
    title: "Tokenizing every GM across X and Farcaster.",
  },
  {
    title: 'GM Coin turns every "GM" post into a digital collectible.',
  },
  {
    title: "Earn $GM and NFTs by Tokenizing your morning greetings.",
  },
];

const STORAGE_KEY = "gm-onboarding-complete";

export function OnboardingScreen({ children }: PropsWithChildren) {
  const { isConnected } = useWalletConnection();
  const { context } = useMiniKit();
  const [step, setStep] = useState(0);
  const [isComplete, setIsComplete] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.sessionStorage.getItem(STORAGE_KEY) === "true";
  });

  const markComplete = useCallback(() => {
    setIsComplete(true);
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(STORAGE_KEY, "true");
    }
  }, []);

  useEffect(() => {
    if (isConnected) {
      markComplete();
    }
  }, [isConnected, markComplete]);

  const isMiniApp = useMemo(() => Boolean(context), [context]);

  const connectButtonClass =
    "w-full cursor-pointer rounded-[999px] border border-white/50 bg-[#66330026] px-6 py-4 text-sm font-semibold text-slate-900 shadow-[0_10px_30px_rgba(3,7,18,0.4)] backdrop-blur-md transition hover:bg-white/50";

  const handleNext = () => {
    if (step < SLIDES.length - 1) {
      setStep((prev) => prev + 1);
    }
  };

  return (
    <>
      {children}
      {!isComplete && (
        <div className="fixed inset-0 z-40 flex flex-col items-center justify-center overflow-hidden px-6 text-center text-black">
          <span className="gm-gradient-layer" />
          <span className="gm-blob-layer" />
          <div className="relative mb-8">
            <Image
              src="/images/gmCup2.svg"
              alt="GM mascot"
              width={220}
              height={220}
              priority
              className="drop-shadow-xl"
            />
          </div>
          <div className="glass max-w-xs rounded-xl border border-white/30 bg-white/70 px-6 py-2 text-xl font-medium text-slate-900 shadow-[0_30px_80px_rgba(3,7,18,0.35)] backdrop-blur-xl">
            {SLIDES[step].title}
          </div>
          <div className="mt-6 flex gap-3">
            {SLIDES.map((_, index) => (
              <span
                key={index}
                className={clsx(
                  "h-1 w-10 rounded-full transition",
                  index === step ? "bg-[#7b3f00]" : "bg-white/40"
                )}
              />
            ))}
          </div>
          <div className="mt-8 flex w-full max-w-xs flex-col gap-4">
            {step < SLIDES.length - 1 ? (
              <button onClick={handleNext} className={connectButtonClass}>
                Next
              </button>
            ) : (
              <>
                {isMiniApp ? (
                  <ConnectWallet className={connectButtonClass}>
                    Connect Wallet
                  </ConnectWallet>
                ) : (
                  <DynamicConnectButton buttonClassName={connectButtonClass}>
                    Connect Wallet
                  </DynamicConnectButton>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
