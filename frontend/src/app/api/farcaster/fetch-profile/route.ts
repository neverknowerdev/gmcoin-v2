import { NextRequest, NextResponse } from "next/server";
import type { FarcasterProfile } from "@/types/social";

/**
 * Fetch Farcaster profile by FID from Farcaster API
 * This is used as a fallback when AuthKit verification fails
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const fid = searchParams.get("fid");

    if (!fid) {
      return NextResponse.json(
        { error: "Missing required parameter: fid" },
        { status: 400 }
      );
    }

    // Fetch profile from Farcaster API
    // Using the public Farcaster API endpoint
    const response = await fetch(
      `https://api.farcaster.xyz/v2/user-by-fid?fid=${fid}`,
      {
        headers: {
          Accept: "application/json",
        },
      }
    );

    if (!response.ok) {
      console.error(`Failed to fetch profile for FID ${fid}:`, response.statusText);
      return NextResponse.json(
        { error: "Failed to fetch profile from Farcaster API" },
        { status: response.status }
      );
    }

    const data = await response.json();
    const user = data?.result?.user;

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const profile: FarcasterProfile = {
      fid: Number(fid),
      username: user.username || user.fname || null,
      displayName: user.displayName || null,
      pfpUrl: user.pfp?.url || user.pfpUrl || null,
    };

    console.log("✅ Fetched profile from Farcaster API:", { fid: profile.fid, username: profile.username });

    return NextResponse.json({ success: true, profile });
  } catch (error) {
    console.error("Error fetching Farcaster profile:", error);
    return NextResponse.json(
      { error: "Failed to fetch Farcaster profile" },
      { status: 500 }
    );
  }
}

