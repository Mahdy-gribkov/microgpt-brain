import type { NextConfig } from "next";

const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:", // unsafe-eval for Three.js shaders, blob: for worker importScripts
      "style-src 'self' 'unsafe-inline'", // Tailwind runtime styles
      "img-src 'self' data: blob:",
      "font-src 'self'",
      "connect-src 'self'",
      "worker-src 'self' blob:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "upgrade-insecure-requests",
    ].join('; '),
  },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
  // Empty turbopack config silences Next.js 16 build warning about having webpack config without turbopack
  turbopack: {},
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Workers need 'self' as global object, not 'window' (undefined in Worker scope)
      config.output = {
        ...config.output,
        globalObject: 'self',
      };
    }
    return config;
  },
};

export default nextConfig;
