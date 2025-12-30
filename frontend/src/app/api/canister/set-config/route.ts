"use server";

import { NextRequest, NextResponse } from "next/server";
import { createCanisterActor } from "@/lib/canister/client";
import { ACCOUNT_MANAGER_ADDRESS } from "@/lib/contracts/accountManager";
import { ethers } from "ethers";

/**
 * API route to configure the canister with contract address and event signatures
 * This should be called once after deployment to set up the canister
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { contractAddress, eventSignatures } = body;

    // Use provided contract address or fall back to env variable
    const accountManagerAddress = contractAddress || ACCOUNT_MANAGER_ADDRESS;

    if (accountManagerAddress === "0x0000000000000000000000000000000000000000") {
      return NextResponse.json(
        { error: "Contract address not configured. Set NEXT_PUBLIC_ACCOUNT_MANAGER_ADDRESS or provide contractAddress in request." },
        { status: 400 }
      );
    }

    // Calculate event signatures if not provided
    const signatures = eventSignatures || {
      VerifyTwitterByAuthCodeRequested: ethers.id("VerifyTwitterByAuthCodeRequested(address,string,string,uint256)"),
      VerifyFarcasterRequested: ethers.id("VerifyFarcasterRequested(uint256,address)"),
    };

    const config = {
      contracts: {
        "Base Mainnet": [accountManagerAddress],
        "WorldChain": [],
        "Monad": [],
      },
      eventSignatures: {
        VerifyTwitterByAuthCodeRequested: signatures.VerifyTwitterByAuthCodeRequested,
        VerifyFarcasterRequested: signatures.VerifyFarcasterRequested,
      },
    };

    // Call the canister to set configuration
    const actor = await createCanisterActor();
    await actor.setConfig(config);

    return NextResponse.json({
      success: true,
      message: "Canister configuration updated successfully",
      config: {
        contractAddress: accountManagerAddress,
        chain: "Base Mainnet",
        eventSignatures: signatures,
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
    chain: "Base Mainnet",
    canisterId: process.env.NEXT_PUBLIC_ICP_CANISTER_ID || "pbyvv-piaaa-aaaal-qs6cq-cai",
    note: "Use POST to configure the canister with setConfig",
  });
}

