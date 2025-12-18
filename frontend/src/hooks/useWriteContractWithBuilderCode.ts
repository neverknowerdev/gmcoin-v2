"use client";

/**
 * Wrapper hook for wagmi's useWriteContract that automatically appends
 * Base Builder Code suffix to all transactions for ERC-8021 attribution.
 */

import { useSendTransaction } from "wagmi";
import { useCallback } from "react";
import { encodeFunctionData, type Address, type Abi } from "viem";
import { appendBuilderCodeSuffix } from "@/lib/builder-code";

// Simplified parameter type that matches wagmi's useWriteContract
interface WriteContractParams {
  address: Address;
  abi: Abi | readonly unknown[];
  functionName: string;
  args?: readonly unknown[];
  value?: bigint;
  chainId?: number;
}

/**
 * Hook that wraps useWriteContract and automatically appends Builder Code suffix
 * to transaction data for Base attribution.
 * 
 * This hook encodes the function call data, appends the Builder Code suffix,
 * and sends the transaction using useSendTransaction.
 * 
 * @returns Same API as useWriteContract, but all transactions include Builder Code suffix
 */
export function useWriteContractWithBuilderCode() {
  const { sendTransactionAsync, data: hash, isPending, error } = useSendTransaction();

  /**
   * Wrapped writeContract function that appends Builder Code suffix
   */
  const writeContract = useCallback(
    async (parameters: WriteContractParams): Promise<`0x${string}`> => {
      const { address, abi, functionName, args, value, chainId } = parameters;

      // Encode the function data using viem
      const encodedData = encodeFunctionData({
        abi: abi as Abi,
        functionName: functionName,
        args: (args || []) as readonly unknown[],
      }) as `0x${string}`;

      // Append Builder Code suffix
      const dataWithSuffix = appendBuilderCodeSuffix(encodedData);

      // Send transaction with suffix appended
      const txHash = await sendTransactionAsync({
        to: address as Address,
        data: dataWithSuffix,
        value: value as bigint | undefined,
        chainId: chainId,
      });

      return txHash;
    },
    [sendTransactionAsync]
  );

  return {
    writeContract,
    writeContractAsync: writeContract,
    data: hash,
    isPending,
    error,
  };
}
