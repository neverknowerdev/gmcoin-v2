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
import { useAccountManager, useVerificationEvents } from "@/hooks/useAccountManager";
import { generateTwitterAuthCode } from "@/lib/twitter-auth-code";
import type { XProfile } from "@/types/social";
import type { FarcasterProfile } from "@/types/social";
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
  const [farcasterConnection, setFarcasterConnection] = useState<FarcasterProfile | null>(null);
  const [tweetID, setTweetID] = useState("");
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<{
    status: "pending" | "success" | "error";
    message?: string;
  } | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);
  const [authCode, setAuthCode] = useState<string>("");
  
  const { 
    requestTwitterVerification, 
    requestFarcasterVerification,
    isPending, 
    hash, 
    isConfirmed, 
    error: txError, 
    isCorrectChain, 
    chainId 
  } = useAccountManager();
  
  const [farcasterVerificationStatus, setFarcasterVerificationStatus] = useState<{
    status: "pending" | "success" | "error";
    message?: string;
  } | null>(null);
  const [isFarcasterVerifying, setIsFarcasterVerifying] = useState(false);
  
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

  // Check Farcaster connection status
  const refreshFarcasterConnection = useCallback(async () => {
    try {
      const response = await fetch("/api/farcaster/status", { cache: "no-store" });
      if (response.ok) {
        const payload = await response.json();
        setFarcasterConnection(payload.connected ? payload.profile ?? null : null);
      }
    } catch (error) {
      console.error("Failed to fetch Farcaster connection status:", error);
    }
  }, []);


  useEffect(() => {
    // Defer async call to avoid synchronous setState in effect
    setTimeout(() => {
      void refreshXConnection();
      void refreshFarcasterConnection();
    }, 0);
  }, [refreshXConnection, refreshFarcasterConnection]);

  // Navigate to confirmation screen when Farcaster is connected
  useEffect(() => {
    if (farcasterConnection && step === 2) {
      // Defer state update to avoid synchronous setState in effect
      setTimeout(() => {
        setStep(5);
      }, 0);
    }
  }, [farcasterConnection, step]);

  // Listen for X and Farcaster connection from popup message (not URL params to avoid navigation)
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    // Listen for postMessage from popup window
    const handleMessage = (event: MessageEvent) => {
      // Only handle messages from same origin for security
      if (event.origin !== window.location.origin) return;
      
      if (event.data?.type === "X_AUTH_SUCCESS" && event.data?.connected) {
        void refreshXConnection();
        // If user is on connect screen (step 2), navigate to verification screen (step 3)
        // User must complete verification before proceeding to success screen
        if (step === 2) {
          setStep(3);
        }
        // If already on verification screen (step 3), stay there - don't skip verification
      }
    };

    window.addEventListener("message", handleMessage);

    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, [refreshXConnection, step]);

  // Poll for Farcaster connection status when on connect screen
  useEffect(() => {
    if (step === 2 && !farcasterConnection) {
      const interval = setInterval(() => {
        void refreshFarcasterConnection();
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [step, farcasterConnection, refreshFarcasterConnection]);

  // Listen for verification events
  useVerificationEvents(
    (twitterID, wallet, isSuccess, errorMsg) => {
      // Convert both to strings for comparison (twitterID might be BigInt)
      const twitterIDStr = twitterID?.toString();
      const xConnectionIdStr = xConnection?.id?.toString();
      
      console.log("🎯 Twitter verification event callback:", { 
        twitterID: twitterIDStr, 
        wallet, 
        address, 
        xConnectionId: xConnectionIdStr, 
        isSuccess,
        matchesWallet: wallet.toLowerCase() === address?.toLowerCase(),
        matchesTwitter: xConnectionIdStr === twitterIDStr,
        walletMatch: wallet.toLowerCase() === address?.toLowerCase(),
        twitterMatch: xConnectionIdStr === twitterIDStr
      });
      
      // Check if wallet matches and twitter ID matches (convert both to strings for comparison)
      const walletMatches = wallet.toLowerCase() === address?.toLowerCase();
      const twitterMatches = xConnectionIdStr === twitterIDStr;
      
      if (walletMatches && twitterMatches) {
        if (isSuccess) {
          console.log("✅ Twitter verification successful, updating UI");
          setVerificationStatus({ status: "success", message: "X account verified successfully!" });
          // Auto-advance to success screen after verification
          if (step === 3) {
            setTimeout(() => {
              console.log("🚀 Advancing to success screen");
              setStep(4);
            }, 1500);
          }
        } else {
          console.log("❌ Twitter verification failed:", errorMsg);
          setVerificationStatus({ status: "error", message: errorMsg || "Verification failed" });
        }
      } else {
        console.log("⚠️ Event doesn't match current user/wallet:", {
          walletMatch: walletMatches,
          twitterMatch: twitterMatches,
          eventTwitterID: twitterIDStr,
          currentTwitterID: xConnectionIdStr,
          eventWallet: wallet,
          currentAddress: address
        });
      }
    },
    (farcasterFid, wallet, isSuccess, errorMsg) => {
      if (wallet.toLowerCase() === address?.toLowerCase() && farcasterConnection?.fid?.toString() === farcasterFid) {
        setIsFarcasterVerifying(false);
        if (isSuccess) {
          setFarcasterVerificationStatus({ status: "success", message: "Farcaster account verified successfully!" });
          // Auto-advance to success screen after verification
          if (step === 5) {
            setTimeout(() => {
              setStep(6);
            }, 1500);
          }
        } else {
          setFarcasterVerificationStatus({ status: "error", message: errorMsg || "Verification failed" });
        }
      }
    }
  );

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
      setVerificationError(`Wrong network! Please switch to Base Mainnet. Current chain: ${chainId}`);
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
    // SignInButton handles the connection, just refresh status
    await refreshFarcasterConnection();
  }, [refreshFarcasterConnection]);

  const handleConfirmFarcaster = useCallback(async () => {
    if (!address || !farcasterConnection?.fid) {
      setFarcasterVerificationStatus({ 
        status: "error", 
        message: "Please connect your wallet and Farcaster account first" 
      });
      return;
    }

    if (!isCorrectChain) {
      setFarcasterVerificationStatus({ 
        status: "error", 
        message: `Wrong network! Please switch to Base Mainnet. Current chain: ${chainId}` 
      });
      return;
    }

    setIsFarcasterVerifying(true);
    setFarcasterVerificationStatus({ status: "pending", message: "Submitting verification..." });

    try {
      await requestFarcasterVerification(farcasterConnection.fid);
      // Hash will be set by useAccountManager hook
      setFarcasterVerificationStatus({ 
        status: "pending", 
        message: "Transaction submitted. Waiting for confirmation..." 
      });
    } catch (err) {
      setIsFarcasterVerifying(false);
      const errorMessage = err instanceof Error ? err.message : "Failed to submit verification";
      setFarcasterVerificationStatus({ status: "error", message: errorMessage });
    }
  }, [address, farcasterConnection, isCorrectChain, chainId, requestFarcasterVerification]);
  
  // Track Farcaster transaction confirmation
  useEffect(() => {
    if (isFarcasterVerifying && hash && isConfirmed) {
      // Use setTimeout to avoid synchronous setState warning
      const timer = setTimeout(() => {
        setFarcasterVerificationStatus({ 
          status: "pending", 
          message: "Transaction confirmed! Waiting for verification..." 
        });
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isFarcasterVerifying, hash, isConfirmed]);

  // Track Twitter transaction confirmation and poll for verification status
  // Use a ref to track if we've already shown the message to prevent loops
  const [hasShownCanisterMessage, setHasShownCanisterMessage] = useState(false);
  const [isPollingVerification, setIsPollingVerification] = useState(false);
  
  useEffect(() => {
    if (hash && isConfirmed && step === 3 && verificationStatus?.status === "pending" && !hasShownCanisterMessage && xConnection?.id && address) {
      console.log("📝 Transaction confirmed, waiting for canister to process verification...");
      console.log("📝 Canister will process the event and the contract will emit TwitterVerificationResult");
      
      // Update message to indicate canister is processing (only once)
      const timeout = setTimeout(() => {
        console.log("⏰ Starting to poll for verification status...");
        setVerificationStatus({ 
          status: "pending", 
          message: "Transaction confirmed! Waiting for canister to process verification..." 
        });
        setHasShownCanisterMessage(true);
        setIsPollingVerification(true);
      }, 5000); // Wait 5 seconds before starting to poll (give canister time to process)
      
      return () => clearTimeout(timeout);
    }
  }, [hash, isConfirmed, step, verificationStatus?.status, hasShownCanisterMessage, xConnection?.id, address]);
  
  // Poll contract to check if verification completed (fallback if event listener doesn't catch it)
  useEffect(() => {
    if (!isPollingVerification || !xConnection?.id || !address || step !== 3 || verificationStatus?.status !== "pending") {
      return;
    }
    
    let pollCount = 0;
    const maxPolls = 30; // Poll for up to 3 minutes (30 * 6 seconds)
    const pollInterval = 6000; // Poll every 6 seconds
    let pollTimer: NodeJS.Timeout | null = null;
    
    const pollVerification = async () => {
      try {
        const { readContract } = await import("wagmi/actions");
        const { createPublicClient, http } = await import("viem");
        const { base } = await import("viem/chains");
        const { ACCOUNT_MANAGER_ABI, ACCOUNT_MANAGER_ADDRESS } = await import("@/lib/contracts/accountManager");
        
        const publicClient = createPublicClient({
          chain: base,
          transport: http()
        });
        
        const twitterID = BigInt(xConnection.id);
        console.log(`🔍 Polling verification status (attempt ${pollCount + 1}/${maxPolls})...`);
        
        const user = await publicClient.readContract({
          address: ACCOUNT_MANAGER_ADDRESS,
          abi: ACCOUNT_MANAGER_ABI,
          functionName: "getUserByTwitterID",
          args: [twitterID],
        }) as any;
        
        if (user && user.primaryWallet && user.primaryWallet.toLowerCase() === address.toLowerCase()) {
          console.log("✅ Verification confirmed by polling contract!");
          setIsPollingVerification(false);
          setVerificationStatus({ status: "success", message: "X account verified successfully!" });
          setTimeout(() => {
            console.log("🚀 Advancing to success screen");
            setStep(4);
          }, 1500);
          return;
        }
      } catch (error: any) {
        // If getUserByTwitterID throws (user doesn't exist), verification hasn't completed yet
        if (error?.message?.includes("UserNotExist") || error?.message?.includes("user does not exist")) {
          // Continue polling - this is expected until verification completes
        } else {
          console.error("❌ Error polling verification status:", error);
        }
      }
      
      pollCount++;
      if (pollCount < maxPolls && isPollingVerification) {
        pollTimer = setTimeout(pollVerification, pollInterval);
      } else {
        console.log("⏰ Polling timeout reached. Please check verification status manually.");
        setIsPollingVerification(false);
      }
    };
    
    // Start polling immediately
    pollVerification();
    
    return () => {
      if (pollTimer) {
        clearTimeout(pollTimer);
      }
    };
  }, [isPollingVerification, xConnection?.id, address, step, verificationStatus?.status]);
  
  // Reset the flags when starting a new verification
  useEffect(() => {
    if (step === 3 && !hash) {
      setHasShownCanisterMessage(false);
      setIsPollingVerification(false);
    }
  }, [step, hash]);

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
              farcasterConnection={farcasterConnection}
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
              isFarcasterConnected={!!farcasterConnection}
              farcasterProfile={farcasterConnection}
              verificationStatus={farcasterVerificationStatus}
              verificationError={farcasterVerificationStatus?.status === "error" ? (farcasterVerificationStatus.message || null) : null}
              hash={isFarcasterVerifying ? hash : undefined}
              isConfirmed={isFarcasterVerifying ? isConfirmed : false}
              txError={txError}
              isPending={isPending && isFarcasterVerifying}
              address={address}
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
              isFarcasterConnected={!!farcasterConnection}
              farcasterProfile={farcasterConnection}
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
