"use server";

import { NextRequest, NextResponse } from "next/server";
import {
  CODE_VERIFIER_COOKIE,
  STATE_COOKIE,
  generateCodeChallenge,
  generateCodeVerifier,
  generateState,
} from "@/lib/server/x-oauth";

export async function GET(request: NextRequest) {
  const clientId = process.env.X_OAUTH_CLIENT_ID;
  const scope = process.env.X_OAUTH_SCOPES ?? "tweet.read users.read offline.access";
  const origin = request.nextUrl.origin;
  const redirectUri =
    process.env.X_OAUTH_REDIRECT_URI ?? `${origin.replace(/\/$/u, "")}/api/x/callback`;

  if (!clientId) {
    return NextResponse.json(
      { error: "X OAuth client ID is not configured" },
      { status: 500 }
    );
  }

  const state = generateState();
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);

  const cookieOptions = {
    httpOnly: true as const,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 600,
  };

  const authUrl = new URL("https://twitter.com/i/oauth2/authorize");
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("scope", scope);
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("code_challenge", codeChallenge);
  authUrl.searchParams.set("code_challenge_method", "S256");

  const response = NextResponse.redirect(authUrl.toString());
  response.cookies.set({
    name: STATE_COOKIE,
    value: state,
    ...cookieOptions,
  });
  response.cookies.set({
    name: CODE_VERIFIER_COOKIE,
    value: codeVerifier,
    ...cookieOptions,
  });

  return response;
}


