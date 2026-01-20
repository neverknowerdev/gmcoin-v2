"use client";

import {
  PropsWithChildren,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useWalletConnection } from "@/hooks/useWalletConnection";
import { useMiniKit, useOpenUrl } from "@coinbase/onchainkit/minikit";
import { useAccountManager } from "@/hooks/useAccountManager";
// Temporarily disabled - Gelato not verified yet
// import { useVerificationEvents } from "@/hooks/useAccountManager";
import { generateTwitterAuthCode } from "@/lib/twitter-auth-code";
import type { XProfile } from "@/types/social";
import { useSignIn, useProfile } from "@farcaster/auth-kit";
import { WelcomeScreen } from "./onboarding/WelcomeScreen";
import { EarnScreen } from "./onboarding/EarnScreen";
import { ConnectSocialScreen } from "./onboarding/ConnectSocialScreen";
import { XVerificationScreen } from "./onboarding/XVerificationScreen";
import { XSuccessScreen } from "./onboarding/XSuccessScreen";
import { FarcasterConfirmationScreen } from "./onboarding/FarcasterConfirmationScreen";
import { FarcasterSuccessScreen } from "./onboarding/FarcasterSuccessScreen";
import { FinalizeSetupScreen } from "./onboarding/FinalizeSetupScreen";
import { AllSetScreen } from "./onboarding/AllSetScreen";

const SLIDES = [
  {
    title: "GM, fren!",
    description: 'Turn your "gm" on X and Farcaster into real $GM rewards',
    showSpeechBubble: true,
  },
  {
    title: 'Earn $GM for every "gm"',
    highlightText: "Tweet → likes → GM bag",
    description: 'Post "gm", "#gm", "$gm" — and earn more if people like it.',
    buttonText: "Try Now",
    showIllustrations: true,
  },
  {
    title: "Connect a social & start earning",
    description: "You need at least one account to verify your GMs",
    helperText: "Or both for better tracking You can add the second one later.",
    showConnectButtons: true,
  },
  {
    title: "Verify your X account",
    description: "Tweet a short verification code so we can link your account.",
    isVerificationScreen: true,
  },
  {
    title: "X successfully connected!",
    description: "Start saying 'gm' to earn $GM everyday.",
    isSuccessScreen: true,
  },
  {
    title: "We found your Farcaster account",
    description: "Just confirm to link it on-chain",
    isFarcasterConfirmation: true,
  },
  {
    title: "Farcaster successfully connected!",
    description: "Start saying 'gm' to earn $GM everyday.",
    isFarcasterSuccess: true,
  },
  {
    title: "Finalize your setup",
    description: "We will write your connected socials to the GM smart-contract",
    isFinalizeScreen: true,
  },
  {
    title: "You're all set!",
    description: "Start saying 'gm' to earn $GM everyday.",
    isAllSetScreen: true,
  },
];

const STORAGE_KEY = "gm-onboarding-complete";

export function OnboardingScreen({ children }: PropsWithChildren) {
  const { isConnected, address } = useWalletConnection();
  const { context } = useMiniKit();
  const openUrl = useOpenUrl();
  const [step, setStep] = useState(0);
  const [xConnection, setXConnection] = useState<XProfile | null>(null);
  const [tweetID, setTweetID] = useState("");

  // Farcaster SIWE hooks
  const {
    connect: connectFarcaster,
    signIn: signInFarcaster,
    isConnected: isFarcasterConnected,
    url: farcasterUrl,
  } = useSignIn({});

  const { profile: farcasterProfile } = useProfile();
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<{
    status: "pending" | "success" | "error";
    message?: string;
  } | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);
  const [authCode, setAuthCode] = useState<string>("");

  const { requestTwitterVerification, isPending, hash, isConfirmed, error: txError, isCorrectChain, chainId } = useAccountManager();

  // Generate auth code once when address is available
  useEffect(() => {
    if (address && !authCode) {
      const code = generateTwitterAuthCode(address);
      // Defer state update to avoid synchronous setState in effect
      setTimeout(() => {
        setAuthCode(code);
      }, 0);
    }
  }, [address, authCode]);

  const [isComplete, setIsCompleteState] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return true;
    return window.sessionStorage.getItem(STORAGE_KEY) === "true";
  });

  const markComplete = useCallback(() => {
    setIsCompleteState(true);
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(STORAGE_KEY, "true");
    }
  }, []);

  // Auto-advance to next slide when wallet connects on first slide
  useEffect(() => {
    if (isConnected && step === 0) {
      // Small delay to show connection success, then advance
      const timer = setTimeout(() => {
        setStep(1);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isConnected, step]);

  const isMiniApp = useMemo(() => Boolean(context), [context]);

  // Check X connection status
  const refreshXConnection = useCallback(async () => {
    try {
      const response = await fetch("/api/x/status");
      if (response.ok) {
        const payload = await response.json();
        setXConnection(payload.connected ? payload.profile ?? null : null);
      }
    } catch (error) {
      console.error("Failed to fetch X connection status:", error);
    }
  }, []);


  useEffect(() => {
    // Defer async call to avoid synchronous setState in effect
    setTimeout(() => {
      void refreshXConnection();
    }, 0);
  }, [refreshXConnection]);

  // Navigate to confirmation screen when Farcaster is authenticated via SIWE
  useEffect(() => {
    if (isFarcasterConnected && farcasterProfile && step === 2) {
      // Defer state update to avoid synchronous setState in effect
      setTimeout(() => {
        setStep(5);
      }, 0);
    }
  }, [isFarcasterConnected, farcasterProfile, step]);

  // Listen for X and Farcaster connection from popup message (not URL params to avoid navigation)
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Listen for postMessage from popup window
    const handleMessage = (event: MessageEvent) => {
      // Only handle messages from same origin for security
      if (event.origin !== window.location.origin) return;

      if (event.data?.type === "X_AUTH_SUCCESS" && event.data?.connected) {
        void refreshXConnection();
        // Navigate to success screen after X connection
        // Temporarily skip verification screen (step 3) and go to success (step 4)
        if (step === 2 || step === 3) {
          setStep(4);
        }
      }

      // Farcaster uses SIWE, so no popup message needed
      // Connection is handled via useProfile hook
    };

    window.addEventListener("message", handleMessage);

    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, [refreshXConnection, step]);

  // Temporarily disabled verification events - Gelato not verified yet
  // useVerificationEvents(
  //   (twitterID, wallet, isSuccess, errorMsg) => {
  //     if (wallet.toLowerCase() === address?.toLowerCase() && xConnection?.id === twitterID) {
  //       if (isSuccess) {
  //         setVerificationStatus({ status: "success", message: "X account verified successfully!" });
  //         setTimeout(() => {
  //           markComplete();
  //         }, 2000);
  //       } else {
  //         setVerificationStatus({ status: "error", message: errorMsg || "Verification failed" });
  //       }
  //     }
  //   },
  //   undefined
  // );

  const handleConnectX = useCallback(() => {
    // Navigate to verification screen first so user can see the code
    setStep(3);
    // Small delay to ensure screen renders with code before opening new tab
    setTimeout(() => {
      const targetPath = "/api/x/connect?popup=true";
      if (isMiniApp) {
        if (typeof window !== "undefined") {
          void openUrl(`${window.location.origin}${targetPath}`);
        }
        return;
      }
      if (typeof window !== "undefined") {
        // Open popup without noopener so we can detect and close it properly
        const popup = window.open(targetPath, "xAuthPopup", "width=600,height=700");
        // Store reference to check if it closes
        if (popup) {
          const checkClosed = setInterval(() => {
            if (popup.closed) {
              clearInterval(checkClosed);
              // Refresh connection status when popup closes
              void refreshXConnection();
            }
          }, 500);
        }
      }
    }, 100);
  }, [isMiniApp, openUrl, refreshXConnection]);

  const handleTweetVerification = useCallback(() => {
    if (!authCode) return;
    const tweetText = encodeURIComponent(authCode);
    const twitterUrl = `https://twitter.com/intent/tweet?text=${tweetText}`;

    if (isMiniApp) {
      void openUrl(twitterUrl);
    } else {
      window.open(twitterUrl, "_blank", "noopener,noreferrer");
    }
  }, [authCode, isMiniApp, openUrl]);

  const handleVerifyTweet = useCallback(async () => {
    if (!address || !xConnection?.id) {
      setVerificationError("Please connect your X account first");
      return;
    }

    if (!tweetID.trim()) {
      setVerificationError("Please enter a tweet ID");
      return;
    }

    setVerificationError(null);
    setVerificationStatus({ status: "pending", message: "Verifying..." });

    if (!isCorrectChain) {
      setVerificationError(`Wrong network! Please switch to Base Sepolia. Current chain: ${chainId}`);
      return;
    }

    try {
      if (!authCode) {
        setVerificationError("Verification code not available. Please refresh the page.");
        return;
      }
      await requestTwitterVerification(authCode, xConnection.id, tweetID.trim());
      setVerificationStatus({ status: "pending", message: "Transaction submitted. Waiting for confirmation..." });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to submit verification";
      setVerificationError(errorMessage);
      setVerificationStatus({ status: "error", message: errorMessage });
    }
  }, [address, xConnection, tweetID, authCode, isCorrectChain, chainId, requestTwitterVerification]);

  const handleConnectFarcaster = useCallback(async () => {
    try {
      // Use Farcaster Auth Kit SIWE
      await connectFarcaster();
      if (farcasterUrl && typeof window !== "undefined") {
        if (isMiniApp) {
          void openUrl(farcasterUrl);
        } else {
          window.open(farcasterUrl, "_blank", "noopener,noreferrer");
        }
      }
      await signInFarcaster();
    } catch (error) {
      console.error("Failed to connect Farcaster:", error);
    }
  }, [connectFarcaster, signInFarcaster, farcasterUrl, isMiniApp, openUrl]);

  const handleConfirmFarcaster = useCallback(() => {
    // After confirming, navigate to success screen
    setStep(6);
  }, []);

  const handleNext = () => {
    if (step < SLIDES.length - 1) {
      setStep((prev) => prev + 1);
    }
  };

  const currentSlide = SLIDES[step];
  const isFirstSlide = step === 0;
  const isSecondSlide = step === 1;
  const isThirdSlide = step === 2;
  const isVerificationSlide = step === 3;
  const isXSuccessSlide = step === 4;
  const isFarcasterConfirmationSlide = step === 5;
  const isFarcasterSuccessSlide = step === 6;
  const isFinalizeSlide = step === 7;
  const isAllSetSlide = step === 8;

  return (
    <>
      {children}
      {!isComplete && (
        <div className="fixed inset-0 z-40 flex flex-col items-center justify-between overflow-hidden px-6 text-center">
          <span className="gm-gradient-layer" />
          <span className="gm-blob-layer" />

          {isFirstSlide ? (
            <WelcomeScreen
              title={currentSlide.title}
              description={currentSlide.description || ""}
              isConnected={isConnected}
              isMiniApp={isMiniApp}
              onNext={handleNext}
              hasNext={step < SLIDES.length - 1}
            />
          ) : isSecondSlide ? (
            <EarnScreen
              title={currentSlide.title}
              highlightText={currentSlide.highlightText || ""}
              description={currentSlide.description || ""}
              buttonText={currentSlide.buttonText || "Next"}
              isMiniApp={isMiniApp}
              onNext={handleNext}
              hasNext={step < SLIDES.length - 1}
            />
          ) : isThirdSlide ? (
            <ConnectSocialScreen
              title={currentSlide.title}
              description={currentSlide.description || ""}
              onConnectX={handleConnectX}
              onConnectFarcaster={handleConnectFarcaster}
            />
          ) : isVerificationSlide ? (
            <XVerificationScreen
              title={currentSlide.title}
              description={currentSlide.description || ""}
              address={address}
              authCode={authCode}
              tweetID={tweetID}
              xConnection={xConnection}
              verificationStatus={verificationStatus}
              verificationError={verificationError}
              hash={hash}
              isConfirmed={isConfirmed}
              txError={txError}
              isPending={isPending}
              isMiniApp={isMiniApp}
              codeCopied={codeCopied}
              onCopyCode={() => {
                if (authCode && typeof window !== "undefined") {
                  navigator.clipboard.writeText(authCode);
                  setCodeCopied(true);
                  setTimeout(() => {
                    setCodeCopied(false);
                  }, 2000);
                }
              }}
              onTweetVerification={handleTweetVerification}
              onVerifyTweet={handleVerifyTweet}
              onConnectX={handleConnectX}
              onTweetIDChange={setTweetID}
            />
          ) : isXSuccessSlide ? (
            <XSuccessScreen
              title={currentSlide.title}
              description={currentSlide.description || ""}
              onContinue={() => setStep(7)}
            />
          ) : isFarcasterConfirmationSlide ? (
            <FarcasterConfirmationScreen
              title={currentSlide.title}
              description={currentSlide.description || ""}
              isFarcasterConnected={isFarcasterConnected}
              farcasterProfile={farcasterProfile}
              onConfirm={handleConfirmFarcaster}
              onConnectFarcaster={handleConnectFarcaster}
            />
          ) : isFarcasterSuccessSlide ? (
            <FarcasterSuccessScreen
              title={currentSlide.title}
              description={currentSlide.description || ""}
              onContinue={() => setStep(7)}
            />
          ) : isFinalizeSlide ? (
            <FinalizeSetupScreen
              title={currentSlide.title}
              description={currentSlide.description || ""}
              xConnection={xConnection}
              isFarcasterConnected={isFarcasterConnected}
              farcasterProfile={farcasterProfile}
              onConnectX={handleConnectX}
              onConnectFarcaster={handleConnectFarcaster}
              onSignUp={() => setStep(8)}
            />
          ) : isAllSetSlide ? (
            <AllSetScreen
              title={currentSlide.title}
              description={currentSlide.description || ""}
              onGoToDashboard={markComplete}
            />
          ) : null}
        </div>
      )}
    </>
  );
}
