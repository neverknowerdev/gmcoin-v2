"use client";

import { useWriteContract, useWaitForTransactionReceipt, useWatchContractEvent, useChainId, useAccount, useConnect, useConnectors } from "wagmi";
import { useWalletConnection } from "./useWalletConnection";
import { ACCOUNT_MANAGER_ABI, ACCOUNT_MANAGER_ADDRESS } from "@/lib/contracts/accountManager";
import { useCallback, useEffect } from "react";
import { base } from "wagmi/chains";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";

const BASE_MAINNET_CHAIN_ID = base.id; // 8453

export function useAccountManager() {
  const { address, isConnected: walletIsConnected } = useWalletConnection();
  const chainId = useChainId();
  const { isConnected, connector } = useAccount();
  const { connect } = useConnect();
  const connectors = useConnectors();
  const dynamicContext = useDynamicContext();
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  // Always use wagmi's hash - we no longer use Dynamic's direct sendTransaction
  const effectiveHash = hash;
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: effectiveHash,
  });

  // Call canister after transaction is confirmed
  useEffect(() => {
    if (isConfirmed && effectiveHash && chainId) {
      const triggerCanisterEvent = async () => {
        try {
          console.log(`🔄 Triggering canister event processing for chain: ${chainId}, tx: ${hash}`);
          
          const response = await fetch("/api/canister/handle-event", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
          body: JSON.stringify({
            chainId: chainId,
            transactionId: effectiveHash,
          }),
          });

          if (!response.ok) {
            const error = await response.json();
            console.error("❌ Failed to trigger canister event:", error);
            return;
          }

          const result = await response.json();
          console.log("✅ Canister event triggered successfully:", result);
        } catch (error) {
          console.error("❌ Error triggering canister event:", error);
          // Don't throw - this is a background operation
        }
      };

      triggerCanisterEvent();
    }
  }, [isConfirmed, effectiveHash, chainId, hash]);

  // Validate chain before transactions
  const validateChain = useCallback(() => {
    if (chainId !== BASE_MAINNET_CHAIN_ID) {
      const errorMsg = `Wrong network! Please switch to Base Mainnet (Chain ID: ${BASE_MAINNET_CHAIN_ID}). Current chain: ${chainId}`;
      console.error("❌", errorMsg);
      throw new Error(errorMsg);
    }
  }, [chainId]);

  const requestTwitterVerification = useCallback(
    async (authCode: string, twitterID: string, tweetID: string) => {
      if (!address) {
        throw new Error("Wallet not connected");
      }

      // If we have an address from useWalletConnection, the wallet is connected
      // (useWalletConnection handles both wagmi and Dynamic wallet connections)
      // For wagmi connectors, try to ensure connector is active if needed
      if (!isConnected && connector && walletIsConnected) {
        // Try to reconnect if we have a connector but wagmi thinks it's disconnected
        // This can happen if the connection state is out of sync
        try {
          console.log("🔄 Attempting to reconnect connector:", connector.name);
          await connect({ connector });
          // Wait a bit for connection to establish
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (err) {
          console.error("❌ Failed to reconnect:", err);
          // If we have an address, we can still proceed - the wallet is connected
          // even if wagmi's connector state is out of sync
        }
      }

      // Validate chain before transaction
      validateChain();

      console.log("🔗 Chain ID:", chainId, "Expected:", BASE_MAINNET_CHAIN_ID);
      console.log("📝 Contract address:", ACCOUNT_MANAGER_ADDRESS);
      console.log("🔌 Connector:", connector?.name, "Connected:", isConnected);

      // Ensure we're using wagmi's writeContract (not Dynamic's direct sendTransaction)
      // This ensures transactions go to the correct contract
      if (!isConnected) {
        throw new Error("Wallet not connected. Please connect your wallet through the wallet connector.");
      }

      return writeContract({
        address: ACCOUNT_MANAGER_ADDRESS,
        abi: ACCOUNT_MANAGER_ABI,
        functionName: "requestTwitterVerificationByAuthCode",
        args: [authCode, BigInt(twitterID), tweetID],
        chainId: BASE_MAINNET_CHAIN_ID, // Explicitly set chain ID
      });
    },
    [address, writeContract, validateChain, chainId, isConnected, connector, connect, walletIsConnected, connectors, dynamicContext]
  );

  const requestFarcasterVerification = useCallback(
    async (farcasterFid: number) => {
      if (!address) {
        throw new Error("Wallet not connected");
      }

      // Validate that wallet is actually connected
      if (!walletIsConnected || !address) {
        throw new Error("Wallet not connected. Please connect your wallet first.");
      }

      // If wagmi connector is not connected, try to connect it
      // This is needed because writeContract requires an active wagmi connector
      if (!isConnected) {
        // Try to find and connect the appropriate connector
        const dynamicWallet = dynamicContext?.primaryWallet;
        
        if (dynamicWallet) {
          // For Dynamic wallet, try to find the Dynamic connector in wagmi
          const dynamicConnector = connectors.find(c => {
            const connectorId = (c as { id?: string }).id || '';
            return c.id === 'dynamic' || 
                   c.name?.toLowerCase().includes('dynamic') ||
                   connectorId.includes('dynamic');
          });
          
          if (dynamicConnector) {
            try {
              console.log("🔄 Connecting Dynamic wallet to wagmi...");
              await connect({ connector: dynamicConnector });
              // Wait for connection to establish
              await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (err) {
              console.error("❌ Failed to connect Dynamic connector:", err);
              throw new Error("Failed to connect wallet to transaction system. Please try reconnecting your wallet.");
            }
          } else if (connector) {
            // Try to reconnect existing connector
            try {
              console.log("🔄 Reconnecting existing connector:", connector.name);
              await connect({ connector });
              await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (err) {
              console.error("❌ Failed to reconnect connector:", err);
              throw new Error("Failed to connect wallet to transaction system. Please try reconnecting your wallet.");
            }
          } else {
            throw new Error("Wallet connector not found. Please reconnect your wallet.");
          }
        } else if (connector) {
          // Try to reconnect existing connector
          try {
            console.log("🔄 Reconnecting existing connector:", connector.name);
            await connect({ connector });
            await new Promise(resolve => setTimeout(resolve, 1000));
          } catch (err) {
            console.error("❌ Failed to reconnect connector:", err);
            throw new Error("Failed to connect wallet to transaction system. Please try reconnecting your wallet.");
          }
        } else {
          throw new Error("Wallet connector not available. Please reconnect your wallet.");
        }
      }

      // Validate chain before transaction
      validateChain();

      console.log("🔗 Chain ID:", chainId, "Expected:", BASE_MAINNET_CHAIN_ID);
      console.log("📝 Contract address:", ACCOUNT_MANAGER_ADDRESS);
      console.log("🔌 Connector:", connector?.name || "Unknown", "Connected:", isConnected);

      return writeContract({
        address: ACCOUNT_MANAGER_ADDRESS,
        abi: ACCOUNT_MANAGER_ABI,
        functionName: "requestFarcasterVerification",
        args: [BigInt(farcasterFid), address],
        chainId: BASE_MAINNET_CHAIN_ID, // Explicitly set chain ID
      });
    },
    [address, writeContract, validateChain, chainId, isConnected, connector, connect, walletIsConnected, connectors, dynamicContext]
  );

  return {
    requestTwitterVerification,
    requestFarcasterVerification,
    isPending,
    isConfirming,
    isConfirmed,
    error,
    hash: effectiveHash,
    transactionHash: effectiveHash,
    chainId,
    isCorrectChain: chainId === BASE_MAINNET_CHAIN_ID,
  };
}

export function useVerificationEvents(
  onTwitterVerified?: (twitterID: string, wallet: string, isSuccess: boolean, errorMsg: string) => void,
  onFarcasterVerified?: (farcasterFid: string, wallet: string, isSuccess: boolean, errorMsg: string) => void
) {
  useWatchContractEvent({
    address: ACCOUNT_MANAGER_ADDRESS,
    abi: ACCOUNT_MANAGER_ABI,
    eventName: "TwitterVerificationResult",
    chainId: BASE_MAINNET_CHAIN_ID,
    onLogs(logs) {
      console.log("📢 TwitterVerificationResult event received:", logs);
      logs.forEach((log) => {
        const { twitterID, wallet, isSuccess, errorMsg } = log.args;
        console.log("📢 TwitterVerificationResult:", { 
          twitterID: twitterID?.toString(), 
          wallet, 
          isSuccess, 
          errorMsg 
        });
        if (onTwitterVerified && twitterID && wallet) {
          onTwitterVerified(twitterID.toString(), wallet, isSuccess ?? false, errorMsg || "");
        }
      });
    },
  });

  useWatchContractEvent({
    address: ACCOUNT_MANAGER_ADDRESS,
    abi: ACCOUNT_MANAGER_ABI,
    eventName: "FarcasterVerificationResult",
    chainId: BASE_MAINNET_CHAIN_ID,
    onLogs(logs) {
      console.log("📢 FarcasterVerificationResult event received:", logs);
      logs.forEach((log) => {
        const { farcasterFid, wallet, isSuccess, errorMsg } = log.args;
        console.log("📢 FarcasterVerificationResult:", { 
          farcasterFid: farcasterFid?.toString(), 
          wallet, 
          isSuccess, 
          errorMsg 
        });
        if (onFarcasterVerified && farcasterFid && wallet) {
          onFarcasterVerified(farcasterFid.toString(), wallet, isSuccess ?? false, errorMsg || "");
        }
      });
    },
  });
}

