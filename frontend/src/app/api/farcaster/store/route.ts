import { NextRequest, NextResponse } from "next/server";
import { FARCASTER_PROFILE_COOKIE, serializeFarcasterProfile } from "@/lib/server/farcaster-oauth";
import type { FarcasterProfile } from "@/types/social";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fid, username, displayName, pfpUrl } = body;

    console.log("📥 Storing Farcaster profile:", { fid, username, displayName, pfpUrl });

    if (!fid || !username) {
      console.error("❌ Missing required fields");
      return NextResponse.json(
        { error: "Missing required fields: fid and username are required" },
        { status: 400 }
      );
    }

    const profile: FarcasterProfile = {
      fid: Number(fid),
      username: username,
      displayName: displayName || null,
      pfpUrl: pfpUrl || null,
    };

    const serialized = serializeFarcasterProfile(profile);
    console.log("✅ Serialized profile:", serialized.substring(0, 50) + "...");

    const cookieOptions = {
      httpOnly: true as const,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    };

    const response = NextResponse.json({ success: true, profile });
    response.cookies.set({
      name: FARCASTER_PROFILE_COOKIE,
      value: serialized,
      ...cookieOptions,
    });

    console.log("✅ Cookie set:", FARCASTER_PROFILE_COOKIE);
    return response;
  } catch (error) {
    console.error("❌ Error storing Farcaster profile:", error);
    return NextResponse.json(
      { error: "Failed to store Farcaster profile" },
      { status: 500 }
    );
  }
}

