"use server";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { FARCASTER_PROFILE_COOKIE, deserializeFarcasterProfile } from "@/lib/server/farcaster-oauth";

const decodeProfileCookie = (value: string) => {
  try {
    return deserializeFarcasterProfile(value);
  } catch {
    return null;
  }
};

export async function GET() {
  const cookieStore = await cookies();
  const rawProfile = cookieStore.get(FARCASTER_PROFILE_COOKIE)?.value;

  if (!rawProfile) {
    return NextResponse.json({ connected: false }, { headers: { "Cache-Control": "no-store" } });
  }

  const profile = decodeProfileCookie(rawProfile);
  if (!profile) {
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

