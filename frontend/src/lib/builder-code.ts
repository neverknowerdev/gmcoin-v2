/**
 * Builder Code utilities for Base ERC-8021 attribution
 * 
 * This module handles encoding Builder Codes into ERC-8021 data suffixes
 * that can be appended to transaction calldata for onchain attribution.
 */

import { Attribution } from "ox/erc8021";

/**
 * Gets the Builder Code from environment variable
 */
export function getBuilderCode(): string | null {
  return process.env.NEXT_PUBLIC_BASE_BUILDER_CODE || null;
}

/**
 * Encodes a Builder Code into an ERC-8021 data suffix
 * @param builderCode - The Builder Code string (e.g., "k3p9da")
 * @param codeRegistryAddress - Optional custom registry address
 * @returns Hex-encoded data suffix string, or null if builderCode is empty
 */
export function encodeBuilderCodeSuffix(
  builderCode: string | null,
  codeRegistryAddress?: string
): `0x${string}` | null {
  if (!builderCode || builderCode.trim() === "") {
    return null;
  }

  try {
    const suffix = Attribution.toDataSuffix({
      codes: [builderCode],
      ...(codeRegistryAddress && { codeRegistryAddress: codeRegistryAddress as `0x${string}` }),
    });

    return suffix as `0x${string}`;
  } catch (error) {
    console.error("Error encoding Builder Code suffix:", error);
    return null;
  }
}

/**
 * Appends Builder Code suffix to transaction data
 * @param data - Original transaction data (hex string)
 * @param builderCode - Optional Builder Code (uses env var if not provided)
 * @returns Transaction data with suffix appended, or original data if suffix is null
 */
export function appendBuilderCodeSuffix(
  data: `0x${string}`,
  builderCode?: string | null
): `0x${string}` {
  const code = builderCode || getBuilderCode();
  const suffix = encodeBuilderCodeSuffix(code);

  if (!suffix) {
    return data;
  }

  // Remove 0x prefix from suffix for appending
  const suffixWithoutPrefix = suffix.slice(2);
  
  // Append suffix to data (data already has 0x prefix)
  return `${data}${suffixWithoutPrefix}` as `0x${string}`;
}
