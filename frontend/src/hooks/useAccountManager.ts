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

  // Log hash when it becomes available
  useEffect(() => {
    if (hash) {
      console.log("📝 Transaction hash received:", hash);
      console.log("📋 View transaction on BaseScan:", `https://basescan.org/tx/${hash}`);
    }
  }, [hash]);

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

      // Validate that wallet is actually connected
      if (!walletIsConnected || !address) {
        throw new Error("Wallet not connected. Please connect your wallet first.");
      }

      // If wagmi connector is not connected, try to connect it
      // This is needed because writeContract requires an active wagmi connector
      if (!isConnected) {
        console.log("🔍 Wallet connection check:", {
          walletIsConnected,
          isConnected,
          hasConnector: !!connector,
          connectorName: connector?.name,
          connectorId: connector?.id,
          availableConnectors: connectors.length,
          connectorIds: connectors.map(c => ({ name: c.name, id: c.id })),
          hasDynamicWallet: !!dynamicContext?.primaryWallet
        });

        // First, try to use the existing connector if available (works for Coinbase, etc.)
        if (connector) {
        try {
            console.log("🔄 Reconnecting existing connector:", connector.name, connector.id);
          await connect({ connector });
            // Wait for connection to establish
            await new Promise(resolve => setTimeout(resolve, 1000));
          } catch (err) {
            console.error("❌ Failed to reconnect existing connector:", err);
            // Continue to try other connectors if this fails
          }
        }

        // If still not connected, try to find and connect the appropriate connector
        if (!isConnected) {
          const dynamicWallet = dynamicContext?.primaryWallet;
          
          if (dynamicWallet) {
            console.log("🔍 Dynamic wallet detected, searching for connectors...");
            
            // Try to find Dynamic connector first
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
                await new Promise(resolve => setTimeout(resolve, 1000));
              } catch (err) {
                console.error("❌ Failed to connect Dynamic connector:", err);
                // Continue to try other connectors
              }
            }

            // If still not connected, try to find any connector that might work
            // (e.g., Coinbase connector when using Coinbase Wallet through Dynamic)
            if (!isConnected && connectors.length > 0) {
              // Try all available connectors that haven't been tried yet
              const triedConnectorIds = new Set([
                connector?.id,
                dynamicConnector?.id
              ].filter(Boolean));

              for (const connectorToTry of connectors) {
                if (triedConnectorIds.has(connectorToTry.id)) continue;
                
                try {
                  console.log("🔄 Trying connector:", connectorToTry.name, connectorToTry.id);
                  await connect({ connector: connectorToTry });
                  await new Promise(resolve => setTimeout(resolve, 1000));
                } catch (err) {
                  console.error(`❌ Failed to connect connector ${connectorToTry.name}:`, err);
                  // Continue to next connector
                }
              }
            }
          } else if (connectors.length > 0) {
            // If no Dynamic wallet but connectors available, try the first one
            const connectorToTry = connector || connectors[0];
            try {
              console.log("🔄 Trying connector:", connectorToTry.name, connectorToTry.id);
              await connect({ connector: connectorToTry });
              await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (err) {
              console.error("❌ Failed to connect connector:", err);
            }
          }
        }

        // Final check - if still not connected after all attempts, throw error with helpful info
        if (!isConnected) {
          const availableConnectorNames = connectors.map(c => c.name || c.id).join(", ");
          throw new Error(
            `Wallet connector not found. Please reconnect your wallet. ` +
            `Available connectors: ${availableConnectorNames || "none"}. ` +
            `Current connector: ${connector?.name || connector?.id || "none"}`
          );
        }
      }

      // Validate chain before transaction
      validateChain();

      // Verify contract address is set
      if (!ACCOUNT_MANAGER_ADDRESS || ACCOUNT_MANAGER_ADDRESS === "0x0000000000000000000000000000000000000000") {
        throw new Error("AccountManager contract address not configured. Please set NEXT_PUBLIC_ACCOUNT_MANAGER_ADDRESS in your environment variables.");
      }

      // Expected contract address (from .env.local)
      const EXPECTED_ADDRESS = "0x7ea1bc48c4CafE3349D696d14f0E3c9C63F02002";
      if (ACCOUNT_MANAGER_ADDRESS.toLowerCase() !== EXPECTED_ADDRESS.toLowerCase()) {
        console.warn("⚠️ Contract address mismatch!", {
          current: ACCOUNT_MANAGER_ADDRESS,
          expected: EXPECTED_ADDRESS,
          message: "The contract address being used doesn't match the expected address. Please check your NEXT_PUBLIC_ACCOUNT_MANAGER_ADDRESS environment variable and restart your dev server."
        });
      }

      console.log("🔗 Chain ID:", chainId, "Expected:", BASE_MAINNET_CHAIN_ID);
      console.log("📝 Contract address:", ACCOUNT_MANAGER_ADDRESS);
      console.log("📝 Env variable NEXT_PUBLIC_ACCOUNT_MANAGER_ADDRESS:", process.env.NEXT_PUBLIC_ACCOUNT_MANAGER_ADDRESS || "not set");
      console.log("🔌 Connector:", connector?.name || "Unknown", "Connected:", isConnected);
      console.log("📤 Sending transaction:", {
        functionName: "requestTwitterVerificationByAuthCode",
        args: { authCode, twitterID, tweetID },
        contractAddress: ACCOUNT_MANAGER_ADDRESS,
        chainId: BASE_MAINNET_CHAIN_ID
      });

      try {
        // writeContract doesn't return the hash directly - it's set in the hook state
        // The hash will be available in the `hash` variable from useWriteContract hook
        await writeContract({
        address: ACCOUNT_MANAGER_ADDRESS,
        abi: ACCOUNT_MANAGER_ABI,
        functionName: "requestTwitterVerificationByAuthCode",
        args: [authCode, BigInt(twitterID), tweetID],
        chainId: BASE_MAINNET_CHAIN_ID, // Explicitly set chain ID
      });
        console.log("✅ Transaction sent successfully. Hash will be available in hook state.");
        // Note: The hash will be available via the `hash` variable from useWriteContract
        // and will be logged when the transaction is confirmed
        return undefined; // writeContract doesn't return the hash
      } catch (error) {
        console.error("❌ Error sending transaction:", error);
        console.error("Transaction details:", {
          address: ACCOUNT_MANAGER_ADDRESS,
          functionName: "requestTwitterVerificationByAuthCode",
          args: [authCode, BigInt(twitterID), tweetID]
        });
        throw error;
      }
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
        console.log("🔍 Wallet connection check:", {
          walletIsConnected,
          isConnected,
          hasConnector: !!connector,
          connectorName: connector?.name,
          connectorId: connector?.id,
          availableConnectors: connectors.length,
          connectorIds: connectors.map(c => ({ name: c.name, id: c.id })),
          hasDynamicWallet: !!dynamicContext?.primaryWallet
        });

        // First, try to use the existing connector if available (works for Coinbase, etc.)
        if (connector) {
          try {
            console.log("🔄 Reconnecting existing connector:", connector.name, connector.id);
            await connect({ connector });
            // Wait for connection to establish
            await new Promise(resolve => setTimeout(resolve, 1000));
          } catch (err) {
            console.error("❌ Failed to reconnect existing connector:", err);
            // Continue to try other connectors if this fails
          }
        }

        // If still not connected, try to find and connect the appropriate connector
        if (!isConnected) {
        const dynamicWallet = dynamicContext?.primaryWallet;
        
        if (dynamicWallet) {
            console.log("🔍 Dynamic wallet detected, searching for connectors...");
            
            // Try to find Dynamic connector first
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
              await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (err) {
              console.error("❌ Failed to connect Dynamic connector:", err);
                // Continue to try other connectors
              }
            }

            // If still not connected, try to find any connector that might work
            // (e.g., Coinbase connector when using Coinbase Wallet through Dynamic)
            if (!isConnected && connectors.length > 0) {
              // Try all available connectors that haven't been tried yet
              const triedConnectorIds = new Set([
                connector?.id,
                dynamicConnector?.id
              ].filter(Boolean));

              for (const connectorToTry of connectors) {
                if (triedConnectorIds.has(connectorToTry.id)) continue;
                
                try {
                  console.log("🔄 Trying connector:", connectorToTry.name, connectorToTry.id);
                  await connect({ connector: connectorToTry });
                  await new Promise(resolve => setTimeout(resolve, 1000));
                } catch (err) {
                  console.error(`❌ Failed to connect connector ${connectorToTry.name}:`, err);
                  // Continue to next connector
                }
              }
            }
          } else if (connectors.length > 0) {
            // If no Dynamic wallet but connectors available, try the first one
            const connectorToTry = connector || connectors[0];
            try {
              console.log("🔄 Trying connector:", connectorToTry.name, connectorToTry.id);
              await connect({ connector: connectorToTry });
              await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (err) {
              console.error("❌ Failed to connect connector:", err);
            }
          }
        }

        // Final check - if still not connected after all attempts, throw error with helpful info
        if (!isConnected) {
          const availableConnectorNames = connectors.map(c => c.name || c.id).join(", ");
          throw new Error(
            `Wallet connector not found. Please reconnect your wallet. ` +
            `Available connectors: ${availableConnectorNames || "none"}. ` +
            `Current connector: ${connector?.name || connector?.id || "none"}`
          );
        }
      }

      // Validate chain before transaction
      validateChain();

      // Verify contract address is set
      if (!ACCOUNT_MANAGER_ADDRESS || ACCOUNT_MANAGER_ADDRESS === "0x0000000000000000000000000000000000000000") {
        throw new Error("AccountManager contract address not configured. Please set NEXT_PUBLIC_ACCOUNT_MANAGER_ADDRESS in your environment variables.");
      }

      console.log("🔗 Chain ID:", chainId, "Expected:", BASE_MAINNET_CHAIN_ID);
      console.log("📝 Contract address:", ACCOUNT_MANAGER_ADDRESS);
      console.log("🔌 Connector:", connector?.name || "Unknown", "Connected:", isConnected);
      console.log("📤 Sending transaction:", {
        functionName: "requestFarcasterVerification",
        args: { farcasterFid, address },
        contractAddress: ACCOUNT_MANAGER_ADDRESS,
        chainId: BASE_MAINNET_CHAIN_ID
      });

      try {
        // writeContract doesn't return the hash directly - it's set in the hook state
        // The hash will be available in the `hash` variable from useWriteContract hook
        await writeContract({
        address: ACCOUNT_MANAGER_ADDRESS,
        abi: ACCOUNT_MANAGER_ABI,
        functionName: "requestFarcasterVerification",
        args: [BigInt(farcasterFid), address],
        chainId: BASE_MAINNET_CHAIN_ID, // Explicitly set chain ID
      });
        console.log("✅ Transaction sent successfully. Hash will be available in hook state.");
        // Note: The hash will be available via the `hash` variable from useWriteContract
        // and will be logged when the transaction is confirmed
        return undefined; // writeContract doesn't return the hash
      } catch (error) {
        console.error("❌ Error sending transaction:", error);
        console.error("Transaction details:", {
          address: ACCOUNT_MANAGER_ADDRESS,
          functionName: "requestFarcasterVerification",
          args: [BigInt(farcasterFid), address]
        });
        throw error;
      }
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
  console.log("🔍 Setting up TwitterVerificationResult event listener:", {
    address: ACCOUNT_MANAGER_ADDRESS,
    chainId: BASE_MAINNET_CHAIN_ID,
    hasCallback: !!onTwitterVerified
  });
  
  useWatchContractEvent({
    address: ACCOUNT_MANAGER_ADDRESS,
    abi: ACCOUNT_MANAGER_ABI,
    eventName: "TwitterVerificationResult",
    chainId: BASE_MAINNET_CHAIN_ID,
    onLogs(logs) {
      console.log("📢 TwitterVerificationResult event received:", logs);
      console.log("📢 Number of logs:", logs.length);
      logs.forEach((log, index) => {
        const { twitterID, wallet, isSuccess, errorMsg } = log.args;
        console.log(`📢 TwitterVerificationResult [${index}]:`, { 
          twitterID: twitterID?.toString(), 
          wallet, 
          isSuccess, 
          errorMsg,
          blockNumber: log.blockNumber,
          transactionHash: log.transactionHash
        });
        if (onTwitterVerified && twitterID && wallet) {
          onTwitterVerified(twitterID.toString(), wallet, isSuccess ?? false, errorMsg || "");
        }
      });
    },
    onError(error: any) {
      // Coinbase RPC doesn't support filters well - this is expected
      // Silently handle filter errors, but log other errors
      if (error?.message?.includes("filter not found") || error?.message?.includes("Invalid parameters")) {
        // This is expected with Coinbase RPC - filters aren't well supported
        // The polling mechanism will handle verification status checking
        return;
      }
      console.error("❌ Error in TwitterVerificationResult event listener:", error);
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

