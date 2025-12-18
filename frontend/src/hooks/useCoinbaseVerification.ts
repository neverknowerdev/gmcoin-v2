"use client";

import { useReadContract, useWaitForTransactionReceipt } from "wagmi";
import { useWriteContractWithBuilderCode } from "./useWriteContractWithBuilderCode";
import { useWalletConnection } from "./useWalletConnection";
import { ACCOUNT_MANAGER_ABI, ACCOUNT_MANAGER_ADDRESS } from "@/lib/contracts/accountManager";
import { useEffect, useState } from "react";
import { parseAbiItem } from "viem";
import { usePublicClient } from "wagmi";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";

// Coinbase Indexer contract address on Base
const COINBASE_INDEXER_ADDRESS = "0x2c7eE1E5f416dfF40054c27A62f7B357C4E8619C" as `0x${string}`;

// Coinbase Verified Account schema ID
const COINBASE_VERIFIED_ACCOUNT_SCHEMA_ID = "0xf8b05c79f090979bf4a80270aba232dff11a10d9ca55c4f88de95317970f0de9" as `0x${string}`;

// Base RPC URL
const BASE_RPC_URL = process.env.NEXT_PUBLIC_BASE_RPC_URL || "https://mainnet.base.org";

export function useCoinbaseVerification() {
  const { address } = useWalletConnection();
  const { primaryWallet } = useDynamicContext();
  const [attestationUID, setAttestationUID] = useState<`0x${string}` | null>(null);
  const [isLoadingAttestation, setIsLoadingAttestation] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const publicClient = usePublicClient();

  // Check if user is using an embedded wallet (Reown/Dynamic)
  // Dynamic wallets have a connector property that indicates if it's embedded
  const isEmbeddedWallet = !!primaryWallet && (
    (primaryWallet as any)?.connector?.isEmbeddedWallet === true ||
    (primaryWallet as any)?.walletConnector?.isEmbeddedWallet === true
  );

  // Get user data by wallet
  const { data: userData, isLoading: isLoadingUser } = useReadContract({
    address: ACCOUNT_MANAGER_ADDRESS,
    abi: ACCOUNT_MANAGER_ABI,
    functionName: "getUserByWallet",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  });

  // Check if user is Coinbase verified
  const isCoinbaseVerified = userData && 
    userData.humanVerification === 4 && // CoinbaseVerification enum value
    userData.coinbaseAttestationUID !== "0x0000000000000000000000000000000000000000000000000000000000000000";

  // Write contract for requesting verification
  const { 
    writeContract: requestVerification, 
    data: hash,
    isPending: isRequesting,
    error: requestError 
  } = useWriteContractWithBuilderCode();

  // Wait for transaction
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  // Fetch attestation UID from Coinbase Indexer
  const fetchAttestationUID = async (walletAddress: string): Promise<`0x${string}` | null> => {
    setIsLoadingAttestation(true);
    setError(null);

    try {
      // Use viem to call the contract on Base network
      // We'll need to create a Base public client
      const { createPublicClient, http } = await import("viem");
      const { base } = await import("viem/chains");
      
      const baseClient = createPublicClient({
        chain: base,
        transport: http(BASE_RPC_URL),
      });

      // Coinbase Indexer ABI
      const indexerABI = [
        {
          inputs: [
            { name: "wallet", type: "address" },
            { name: "schemaId", type: "bytes32" },
          ],
          name: "getAttestationUid",
          outputs: [{ name: "", type: "bytes32" }],
          stateMutability: "view",
          type: "function",
        },
      ] as const;

      const uid = await baseClient.readContract({
        address: COINBASE_INDEXER_ADDRESS,
        abi: indexerABI,
        functionName: "getAttestationUid",
        args: [walletAddress as `0x${string}`, COINBASE_VERIFIED_ACCOUNT_SCHEMA_ID],
      });

      if (uid && uid !== "0x0000000000000000000000000000000000000000000000000000000000000000") {
        return uid;
      }

      return null;
    } catch (err: any) {
      console.error("Error fetching attestation UID:", err);
      setError(err.message || "Failed to fetch attestation from Coinbase");
      return null;
    } finally {
      setIsLoadingAttestation(false);
    }
  };

  // Request Coinbase verification
  const requestCoinbaseVerification = async () => {
    if (!address) {
      setError("Wallet not connected");
      return;
    }

    setError(null);

    // First, try to fetch the attestation UID
    const uid = await fetchAttestationUID(address);
    
    if (!uid) {
      setError("No Coinbase verification found. Please verify your wallet on Coinbase first.");
      return;
    }

    setAttestationUID(uid);

    // Call the contract to request verification
    try {
      await requestVerification({
        address: ACCOUNT_MANAGER_ADDRESS,
        abi: ACCOUNT_MANAGER_ABI,
        functionName: "requestCoinbaseVerification",
        args: [uid],
      });
    } catch (err: any) {
      console.error("Error requesting verification:", err);
      setError(err.message || "Failed to request verification");
    }
  };

  // Listen for verification result events
  useEffect(() => {
    if (!address || !publicClient) return;

    const checkVerificationResult = async () => {
      try {
        // Listen for CoinbaseVerificationResult event
        const logs = await publicClient.getLogs({
          address: ACCOUNT_MANAGER_ADDRESS,
          event: parseAbiItem(
            "event CoinbaseVerificationResult(address indexed wallet, bytes32 attestationUID, bool isSuccess, string errorMsg)"
          ),
          args: {
            wallet: address,
          },
          fromBlock: "latest",
          toBlock: "latest",
        });

        if (logs.length > 0) {
          const latestLog = logs[logs.length - 1];
          // The event will be processed by the Web3Function
          // We can refresh the user data here
          window.location.reload(); // Simple refresh, could be optimized
        }
      } catch (err) {
        console.error("Error checking verification result:", err);
      }
    };

    if (isConfirmed) {
      // Wait a bit for the Web3Function to process
      setTimeout(checkVerificationResult, 5000);
    }
  }, [address, isConfirmed, publicClient]);

  return {
    isCoinbaseVerified: !!isCoinbaseVerified,
    coinbaseAttestationUID: userData?.coinbaseAttestationUID,
    isLoading: isLoadingUser || isLoadingAttestation || isRequesting || isConfirming,
    error: error || (requestError?.message || null),
    requestCoinbaseVerification,
    fetchAttestationUID,
    isEmbeddedWallet,
  };
}
