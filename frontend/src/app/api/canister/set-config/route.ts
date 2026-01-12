"use server";

import { NextRequest, NextResponse } from "next/server";
import { setContractAddresses } from "@/lib/canister/client";
import { ACCOUNT_MANAGER_ADDRESS } from "@/lib/contracts/accountManager";

/**
 * API route to configure the canister with contract addresses
 * This should be called once after deployment to set up the canister
 * 
 * Contract addresses on Base Mainnet: 0x7ea1bc48c4CafE3349D696d14f0E3c9C63F02002
 * Contract addresses on WorldChain: 0x7ea1bc48c4CafE3349D696d14f0E3c9C63F02002 (same address)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { baseMainnet, worldChain, baseMainnetGMCoin, worldChainGMCoin } = body;

    // Use provided contract addresses or fall back to env variable/default
    const baseMainnetAccountManager = baseMainnet || ACCOUNT_MANAGER_ADDRESS;
    const worldChainAccountManager = worldChain || ACCOUNT_MANAGER_ADDRESS;

    if (baseMainnetAccountManager === "0x0000000000000000000000000000000000000000") {
      return NextResponse.json(
        { error: "Contract address not configured. Set NEXT_PUBLIC_ACCOUNT_MANAGER_ADDRESS or provide baseMainnet in request." },
        { status: 400 }
      );
    }

    const config = {
      contracts: {
        "Base Mainnet": {
          accountManager: baseMainnetAccountManager,
          GMCoin: baseMainnetGMCoin || undefined,
        },
        "WorldChain": {
          accountManager: worldChainAccountManager,
          GMCoin: worldChainGMCoin || undefined,
        },
      },
    };

    // Call the canister to set contract addresses
    await setContractAddresses(config);

    return NextResponse.json({
      success: true,
      message: "Canister contract addresses updated successfully",
      config: {
        baseMainnet: {
          accountManager: baseMainnetAccountManager,
          GMCoin: baseMainnetGMCoin || null,
        },
        worldChain: {
          accountManager: worldChainAccountManager,
          GMCoin: worldChainGMCoin || null,
        },
      },
    });
  } catch (error) {
    console.error("Error configuring canister:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        error: "Failed to configure canister",
        message: errorMessage,
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to check current canister configuration
 */
export async function GET() {
  return NextResponse.json({
    contractAddress: ACCOUNT_MANAGER_ADDRESS,
    canisterId: process.env.NEXT_PUBLIC_ICP_CANISTER_ID || "ylges-qaaaa-aaaal-qtlsq-cai",
    note: "Use POST to configure the canister with setContractAddresses",
    example: {
      baseMainnet: ACCOUNT_MANAGER_ADDRESS,
      worldChain: ACCOUNT_MANAGER_ADDRESS,
      baseMainnetGMCoin: "optional GMCoin address",
      worldChainGMCoin: "optional GMCoin address",
    },
  });
}

