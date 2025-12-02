"use server";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { PROFILE_COOKIE } from "@/lib/server/x-oauth";

export async function POST() {
  const cookieStore = await cookies();
  const response = NextResponse.json({ success: true });
  
  // Delete the cookie by setting it with maxAge 0
  response.cookies.set({
    name: PROFILE_COOKIE,
    value: "",
    path: "/",
    maxAge: 0,
  });
  
  return response;
}

export async function DELETE() {
  return POST();
}


