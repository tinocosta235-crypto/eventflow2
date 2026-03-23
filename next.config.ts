import type { NextConfig } from "next";

// ─────────────────────────────────────────────────────────────
// Security headers applied to ALL routes
// ─────────────────────────────────────────────────────────────

const CSP_DIRECTIVES = [
  // Fetch directives
  "default-src 'self'",
  // Scripts: allow self + Vercel live-feedback (dev only via env)
  "script-src 'self' 'unsafe-inline'",
  // Styles: allow self + inline styles (Tailwind generates them at runtime)
  "style-src 'self' 'unsafe-inline'",
  // Images: allow self + data URIs (QR codes, avatars) + Supabase storage
  "img-src 'self' data: blob: https://*.supabase.co https://*.supabase.in",
  // Fonts: self only
  "font-src 'self'",
  // Connect: self + Supabase (DB/Auth) + Resend (if called server-side only
  //          from Vercel edge, so no direct browser connect needed, but
  //          keeping 'self' + Supabase covers WebSocket realtime)
  "connect-src 'self' https://*.supabase.co https://*.supabase.in wss://*.supabase.co",
  // Frame: deny embedding completely
  "frame-src 'none'",
  "frame-ancestors 'none'",
  // Other fetch contexts
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  // Workers: none
  "worker-src 'none'",
  // Upgrade insecure requests in production
  process.env.NODE_ENV === "production" ? "upgrade-insecure-requests" : "",
]
  .filter(Boolean)
  .join("; ");

const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: CSP_DIRECTIVES,
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "X-DNS-Prefetch-Control",
    value: "off",
  },
  {
    key: "X-XSS-Protection",
    value: "1; mode=block",
  },
];

const nextConfig: NextConfig = {
  serverExternalPackages: ["pg", "@prisma/client", "@prisma/adapter-pg", "bcryptjs"],

  async headers() {
    return [
      {
        // Apply to all routes
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
