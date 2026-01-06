"use server";

import { NextRequest, NextResponse } from "next/server";
import { handleCanisterEvent } from "@/lib/canister/client";

/**
 * API route to trigger canister event processing
 * Called after a smart contract transaction that emits verification events
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { chain, transactionId } = body;

    if (!chain || !transactionId) {
      return NextResponse.json(
        { error: "Missing required fields: chain and transactionId" },
        { status: 400 }
      );
    }

    // Validate chain name
    const validChains = ["Base Mainnet", "WorldChain", "Monad"];
    if (!validChains.includes(chain)) {
      return NextResponse.json(
        { error: `Invalid chain. Must be one of: ${validChains.join(", ")}` },
        { status: 400 }
      );
    }

    // Validate transaction ID format (should be a hex string)
    if (!/^0x[a-fA-F0-9]{64}$/.test(transactionId)) {
      return NextResponse.json(
        { error: "Invalid transaction ID format" },
        { status: 400 }
      );
    }

    // Call the canister to process the event
    await handleCanisterEvent(chain, transactionId);

    return NextResponse.json({
      success: true,
      message: `Event processed for chain ${chain}, transaction ${transactionId}`,
    });
  } catch (error) {
    console.error("Error processing canister event:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        error: "Failed to process canister event",
        message: errorMessage,
      },
      { status: 500 }
    );
  }
}

