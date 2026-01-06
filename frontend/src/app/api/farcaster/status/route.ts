"use server";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { FARCASTER_PROFILE_COOKIE } from "@/lib/server/farcaster-oauth";
import type { FarcasterProfile } from "@/types/social";

export async function GET() {
  const cookieStore = await cookies();
  const rawProfile = cookieStore.get(FARCASTER_PROFILE_COOKIE)?.value;

  if (!rawProfile) {
    return NextResponse.json({ connected: false }, { headers: { "Cache-Control": "no-store" } });
  }

  let profile: FarcasterProfile;
  try {
    profile = JSON.parse(rawProfile) as FarcasterProfile;
  } catch {
    const response = NextResponse.json(
      { connected: false },
      { headers: { "Cache-Control": "no-store" } }
    );
    response.cookies.set({
      name: FARCASTER_PROFILE_COOKIE,
      value: "",
      path: "/",
      maxAge: 0,
    });
    return response;
  }

  return NextResponse.json(
    { connected: true, profile },
    { headers: { "Cache-Control": "no-store" } }
  );
}

