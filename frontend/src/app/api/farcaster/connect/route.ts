"use server";

import { NextRequest, NextResponse } from "next/server";
import {
  FARCASTER_STATE_COOKIE,
  generateFarcasterState,
} from "@/lib/server/farcaster-oauth";

export async function GET(request: NextRequest) {
  const clientId = process.env.FARCASTER_OAUTH_CLIENT_ID;
  const scope =
    process.env.FARCASTER_OAUTH_SCOPES ?? "openid offline_access";
  const authorizationEndpoint = process.env.FARCASTER_OAUTH_AUTHORIZE_URL;

  const origin = request.nextUrl.origin;
  const redirectUri =
    process.env.FARCASTER_OAUTH_REDIRECT_URI ??
    `${origin.replace(/\/$/u, "")}/api/farcaster/callback`;

  if (!clientId || !authorizationEndpoint) {
    return NextResponse.json(
      { error: "Farcaster OAuth is not fully configured" },
      { status: 500 }
    );
  }

  const state = generateFarcasterState();

  const authUrl = new URL(authorizationEndpoint);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("scope", scope);
  authUrl.searchParams.set("state", state);

  const cookieOptions = {
    httpOnly: true as const,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 600,
  };

  const response = NextResponse.redirect(authUrl.toString());
  response.cookies.set({
    name: FARCASTER_STATE_COOKIE,
    value: state,
    ...cookieOptions,
  });

  return response;
}


