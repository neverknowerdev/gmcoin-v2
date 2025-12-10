"use server";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { PROFILE_COOKIE } from "@/lib/server/x-oauth";

export async function POST() {
  const cookieStore = cookies();
  cookieStore.delete(PROFILE_COOKIE);
  return NextResponse.json({ success: true });
}

export async function DELETE() {
  return POST();
}


