"use server";

import { NextResponse } from "next/server";

/**
 * This route is kept for compatibility but Farcaster authentication
 * now uses Sign In with Farcaster (SIWF) via AuthKit client-side.
 * 
 * The actual sign-in happens client-side using @farcaster/auth-kit's useSignIn hook.
 * After successful sign-in, the profile is stored via /api/farcaster/store
 */
export async function GET() {
  return NextResponse.json(
    {
      message: "Farcaster authentication uses Sign In with Farcaster (SIWF) via AuthKit",
      note: "Use the useSignIn hook from @farcaster/auth-kit on the client side to initiate sign-in",
      documentation: "https://docs.farcaster.xyz/auth-kit/hooks/use-sign-in",
    },
    { status: 200 }
  );
}


