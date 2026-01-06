import type { NextConfig } from "next";

const csp = `
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.coinbase.com https://*.dynamic.xyz;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  img-src 'self' data: blob: https://*.coinbase.com https://dynamic-static-assets.com https://iconic.dynamic-static-assets.com https://pbs.twimg.com;
  font-src 'self' data: https://fonts.gstatic.com https://fonts.googleapis.com https://dynamic-static-assets.com https://iconic.dynamic-static-assets.com;
  connect-src 'self' https://*.coinbase.com https://*.dynamic.xyz https://app.dynamicauth.com https://dynamic-static-assets.com https://iconic.dynamic-static-assets.com https://logs.dynamicauth.com https://relay.farcaster.xyz https://mainnet.optimism.io https://*.walletconnect.com https://*.base.org https://farcaster.xyz;
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
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "pbs.twimg.com",
      },
      {
        protocol: "https",
        hostname: "warpcast.com",
      },
      {
        protocol: "https",
        hostname: "*.warpcast.com",
      },
      {
        protocol: "https",
        hostname: "ipfs.io",
      },
      {
        protocol: "https",
        hostname: "gateway.ipfs.io",
      },
      {
        protocol: "https",
        hostname: "*.ipfs.io",
      },
      {
        protocol: "https",
        hostname: "neynar.com",
      },
      {
        protocol: "https",
        hostname: "*.neynar.com",
      },
      {
        protocol: "https",
        hostname: "imagedelivery.net",
      },
      {
        protocol: "https",
        hostname: "*.imagedelivery.net",
      },
    ],
  },
  webpack: (config, { isServer }) => {
    // Ignore test files from thread-stream and other packages
    const webpack = require('webpack');
    config.plugins = config.plugins || [];
    
    // Ignore specific thread-stream test files that cause build errors
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /thread-stream\/test\/(close-on-gc|create-and-exit|esm|thread-management)\.(js|mjs)$/,
      })
    );

    // Ignore all test files in node_modules
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /\.test\.(js|mjs|ts|tsx)$/,
        contextRegExp: /node_modules/,
      })
    );

    // Ignore optional dependencies that may not be available
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /^@react-native-async-storage\/async-storage$/,
      })
    );

    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /^pino-pretty$/,
      })
    );

    return config;
  },
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
