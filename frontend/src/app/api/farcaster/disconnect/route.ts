"use server";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { FARCASTER_PROFILE_COOKIE } from "@/lib/server/farcaster-oauth";

export async function POST() {
  const cookieStore = await cookies();
  const response = NextResponse.json({ success: true });
  
  // Delete the cookie by setting it with maxAge 0
  response.cookies.set({
    name: FARCASTER_PROFILE_COOKIE,
    value: "",
    path: "/",
    maxAge: 0,
  });
  
  return response;
}

export async function DELETE() {
  return POST();
}

