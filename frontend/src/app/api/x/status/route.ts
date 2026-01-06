"use server";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { PROFILE_COOKIE } from "@/lib/server/x-oauth";

const decodeProfileCookie = (value: string) => {
  try {
    const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
    const pad = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
    const decoded = Buffer.from(normalized + pad, "base64").toString("utf-8");
    return JSON.parse(decoded);
  } catch {
    return null;
  }
};

export async function GET() {
  const cookieStore = await cookies();
  const rawProfile = cookieStore.get(PROFILE_COOKIE)?.value;

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
      name: PROFILE_COOKIE,
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


