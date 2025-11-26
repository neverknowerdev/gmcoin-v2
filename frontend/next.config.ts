import type { NextConfig } from "next";

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
  {
    key: "Content-Security-Policy",
    value: csp,
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "X-Frame-Options",
    value: "SAMEORIGIN",
  },
];

const nextConfig: NextConfig = {
  reactCompiler: true,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
