import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const csp = `
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.coinbase.com https://*.dynamic.xyz;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  img-src 'self' data: blob: https://*.coinbase.com https://dynamic-static-assets.com https://iconic.dynamic-static-assets.com https://pbs.twimg.com;
  font-src 'self' data: https://fonts.gstatic.com https://fonts.googleapis.com https://dynamic-static-assets.com https://iconic.dynamic-static-assets.com;
  connect-src 'self' https://*.coinbase.com https://*.dynamic.xyz https://app.dynamicauth.com https://dynamic-static-assets.com https://iconic.dynamic-static-assets.com https://logs.dynamicauth.com https://relay.farcaster.xyz https://mainnet.optimism.io https://*.walletconnect.com https://*.base.org;
  frame-src 'self' https://*.coinbase.com https://*.dynamic.xyz https://app.dynamicauth.com;
`.replace(/\s{2,}/g, " ").trim();

const securityHeaders = [
  ["Content-Security-Policy", csp],
  ["Referrer-Policy", "strict-origin-when-cross-origin"],
  ["X-Content-Type-Options", "nosniff"],
  ["X-Frame-Options", "SAMEORIGIN"],
];

export function proxy(request: NextRequest) {
  const response = NextResponse.next();
  securityHeaders.forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

