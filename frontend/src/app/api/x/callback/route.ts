"use server";

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  CODE_VERIFIER_COOKIE,
  PROFILE_COOKIE,
  STATE_COOKIE,
  serializeProfile,
} from "@/lib/server/x-oauth";
import type { XProfile } from "@/types/social";

const TOKEN_ENDPOINT = "https://api.twitter.com/2/oauth2/token";
const USER_ENDPOINT =
  "https://api.twitter.com/2/users/me?user.fields=id,name,username,profile_image_url";

export async function GET(request: NextRequest) {
  const clientId = process.env.X_OAUTH_CLIENT_ID;
  const clientSecret = process.env.X_OAUTH_CLIENT_SECRET;
  const origin = request.nextUrl.origin;
  const redirectUri =
    process.env.X_OAUTH_REDIRECT_URI ?? `${origin.replace(/\/$/u, "")}/api/x/callback`;

  const redirectTarget = new URL("/", origin);

  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const returnedState = searchParams.get("state");
  const oauthError = searchParams.get("error");

  const cookieStore = await cookies();
  const storedState = cookieStore.get(STATE_COOKIE)?.value;
  const codeVerifier = cookieStore.get(CODE_VERIFIER_COOKIE)?.value;

  if (oauthError) {
    redirectTarget.searchParams.set("xAuth", oauthError);
    const response = NextResponse.redirect(redirectTarget);
    response.cookies.set({
      name: STATE_COOKIE,
      value: "",
      path: "/",
      maxAge: 0,
    });
    response.cookies.set({
      name: CODE_VERIFIER_COOKIE,
      value: "",
      path: "/",
      maxAge: 0,
    });
    return response;
  }

  if (!clientId || !code || !returnedState || !storedState || !codeVerifier) {
    redirectTarget.searchParams.set("xAuth", "invalid_request");
    const response = NextResponse.redirect(redirectTarget);
    response.cookies.set({
      name: STATE_COOKIE,
      value: "",
      path: "/",
      maxAge: 0,
    });
    response.cookies.set({
      name: CODE_VERIFIER_COOKIE,
      value: "",
      path: "/",
      maxAge: 0,
    });
    return response;
  }

  if (returnedState !== storedState) {
    redirectTarget.searchParams.set("xAuth", "state_mismatch");
    const response = NextResponse.redirect(redirectTarget);
    response.cookies.set({
      name: STATE_COOKIE,
      value: "",
      path: "/",
      maxAge: 0,
    });
    response.cookies.set({
      name: CODE_VERIFIER_COOKIE,
      value: "",
      path: "/",
      maxAge: 0,
    });
    return response;
  }

  const tokenParams = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    code_verifier: codeVerifier,
  });

  const tokenHeaders: Record<string, string> = {
    "Content-Type": "application/x-www-form-urlencoded",
  };

  if (clientSecret) {
    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`, "utf-8").toString("base64");
    tokenHeaders.Authorization = `Basic ${basicAuth}`;
  }

  const tokenResponse = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: tokenHeaders,
    body: tokenParams.toString(),
  });
  const tokenPayload = await tokenResponse.json();

  if (!tokenResponse.ok || !tokenPayload?.access_token) {
    redirectTarget.searchParams.set("xAuth", "token_error");
    const response = NextResponse.redirect(redirectTarget);
    response.cookies.set({
      name: STATE_COOKIE,
      value: "",
      path: "/",
      maxAge: 0,
    });
    response.cookies.set({
      name: CODE_VERIFIER_COOKIE,
      value: "",
      path: "/",
      maxAge: 0,
    });
    return response;
  }

  const profileResponse = await fetch(USER_ENDPOINT, {
    headers: {
      Authorization: `Bearer ${tokenPayload.access_token}`,
    },
  });
  const profilePayload = await profileResponse.json();

  if (!profileResponse.ok || !profilePayload?.data) {
    redirectTarget.searchParams.set("xAuth", "profile_error");
    const response = NextResponse.redirect(redirectTarget);
    response.cookies.set({
      name: STATE_COOKIE,
      value: "",
      path: "/",
      maxAge: 0,
    });
    response.cookies.set({
      name: CODE_VERIFIER_COOKIE,
      value: "",
      path: "/",
      maxAge: 0,
    });
    return response;
  }

  const profile: XProfile = {
    id: profilePayload.data.id,
    name: profilePayload.data.name,
    username: profilePayload.data.username,
    profileImageUrl: profilePayload.data.profile_image_url ?? null,
  };

  // Set cookies
  const cookieOptions = {
    httpOnly: true as const,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
  };

  // Check if this is a popup (from query param or window.opener)
  const isPopup = request.nextUrl.searchParams.get("popup") === "true" || 
                  request.headers.get("referer")?.includes("popup");

  // Always return HTML that closes the window and notifies the parent
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>X Authentication Successful</title>
      </head>
      <body>
        <script>
          // Try to notify parent window first
          try {
            if (window.opener && !window.opener.closed) {
              window.opener.postMessage({ type: 'X_AUTH_SUCCESS', connected: true }, window.location.origin);
            }
          } catch (e) {
            // Ignore errors
          }
          
          // Immediately try to close the window
          // This works if window was opened via window.open() without noopener
          window.close();
          
          // Fallback: if window doesn't close, redirect to blank page
          setTimeout(function() {
            if (!document.hidden) {
              // Window didn't close, redirect to blank page instead of home
              window.location.href = 'about:blank';
            }
          }, 200);
        </script>
        <p style="font-family: sans-serif; text-align: center; padding: 20px;">
          Authentication successful!<br>
          This window should close automatically...
        </p>
      </body>
    </html>
  `;

  const response = new NextResponse(html, {
    headers: {
      "Content-Type": "text/html",
    },
  });

  response.cookies.set({
    name: STATE_COOKIE,
    value: "",
    path: "/",
    maxAge: 0,
  });
  response.cookies.set({
    name: CODE_VERIFIER_COOKIE,
    value: "",
    path: "/",
    maxAge: 0,
  });
  response.cookies.set({
    name: PROFILE_COOKIE,
    value: serializeProfile(profile),
    ...cookieOptions,
    maxAge: 60 * 60 * 24 * 30,
  });

  return response;
}


