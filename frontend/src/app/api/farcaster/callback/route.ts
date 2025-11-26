"use server";

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  FARCASTER_PROFILE_COOKIE,
  FARCASTER_STATE_COOKIE,
  deserializeFarcasterProfile,
} from "@/lib/server/farcaster-oauth";
import type { FarcasterProfile } from "@/types/social";

export async function GET(request: NextRequest) {
  const clientId = process.env.FARCASTER_OAUTH_CLIENT_ID;
  const clientSecret = process.env.FARCASTER_OAUTH_CLIENT_SECRET;
  const tokenEndpoint = process.env.FARCASTER_OAUTH_TOKEN_URL;
  const userInfoEndpoint = process.env.FARCASTER_OAUTH_USERINFO_URL;

  const origin = request.nextUrl.origin;
  const redirectUri =
    process.env.FARCASTER_OAUTH_REDIRECT_URI ??
    `${origin.replace(/\/$/u, "")}/api/farcaster/callback`;

  const redirectTarget = new URL("/", origin);

  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const returnedState = searchParams.get("state");
  const oauthError = searchParams.get("error");

  const cookieStore = await cookies();
  const storedState = cookieStore.get(FARCASTER_STATE_COOKIE)?.value;

  const clearStateCookies = (response: NextResponse) => {
    response.cookies.set({
      name: FARCASTER_STATE_COOKIE,
      value: "",
      path: "/",
      maxAge: 0,
    });
  };

  if (oauthError) {
    redirectTarget.searchParams.set("fcAuth", oauthError);
    const response = NextResponse.redirect(redirectTarget);
    clearStateCookies(response);
    return response;
  }

  if (!clientId || !tokenEndpoint || !userInfoEndpoint || !code || !returnedState) {
    redirectTarget.searchParams.set("fcAuth", "invalid_request");
    const response = NextResponse.redirect(redirectTarget);
    clearStateCookies(response);
    return response;
  }

  if (!storedState || returnedState !== storedState) {
    redirectTarget.searchParams.set("fcAuth", "state_mismatch");
    const response = NextResponse.redirect(redirectTarget);
    clearStateCookies(response);
    return response;
  }

  const tokenParams = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
  });

  const tokenHeaders: Record<string, string> = {
    "Content-Type": "application/x-www-form-urlencoded",
  };

  if (clientSecret) {
    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`, "utf-8").toString("base64");
    tokenHeaders.Authorization = `Basic ${basicAuth}`;
  }

  const tokenResponse = await fetch(tokenEndpoint, {
    method: "POST",
    headers: tokenHeaders,
    body: tokenParams.toString(),
  });
  const tokenPayload = await tokenResponse.json();

  if (!tokenResponse.ok || !tokenPayload?.access_token) {
    redirectTarget.searchParams.set("fcAuth", "token_error");
    const response = NextResponse.redirect(redirectTarget);
    clearStateCookies(response);
    return response;
  }

  const profileResponse = await fetch(userInfoEndpoint, {
    headers: {
      Authorization: `Bearer ${tokenPayload.access_token}`,
    },
  });
  const profilePayload = await profileResponse.json();

  if (!profileResponse.ok || !profilePayload) {
    redirectTarget.searchParams.set("fcAuth", "profile_error");
    const response = NextResponse.redirect(redirectTarget);
    clearStateCookies(response);
    return response;
  }

  const rawProfile =
    profilePayload.result?.user ??
    profilePayload.user ??
    profilePayload.data ??
    profilePayload;

  const profile: FarcasterProfile = {
    fid: Number(rawProfile.fid ?? rawProfile.id),
    username: rawProfile.username,
    displayName: rawProfile.display_name ?? rawProfile.displayName ?? null,
    pfpUrl: rawProfile.pfp_url ?? rawProfile.pfpUrl ?? null,
  };

  redirectTarget.searchParams.set("fcAuth", "connected");
  const response = NextResponse.redirect(redirectTarget);
  clearStateCookies(response);
  response.cookies.set({
    name: FARCASTER_PROFILE_COOKIE,
    value: JSON.stringify(profile),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  return response;
}


