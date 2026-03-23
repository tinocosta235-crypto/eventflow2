import { NextRequest, NextResponse } from "next/server";

// ─────────────────────────────────────────────────────────────────────────────
// Rate limiting — in-memory sliding window, Edge-runtime compatible.
// Uses Web Crypto (crypto.subtle) — no Node.js built-ins.
// ─────────────────────────────────────────────────────────────────────────────

interface WindowEntry {
  timestamps: number[];
}

// Global Maps survive across requests in the same V8 isolate.
const store = new Map<string, WindowEntry>();

const WINDOW_MS = 60_000; // 1 minute

type RateLimitConfig = { max: number };

const LIMITS: Record<string, RateLimitConfig> = {
  auth:    { max: 10  },  // /api/auth/* and /api/register/*
  general: { max: 100 },  // all other /api/* routes
};

/**
 * Returns `true` if the request should be blocked (limit exceeded).
 * bucket: "auth" | "general"
 */
function isRateLimited(ip: string, bucket: "auth" | "general"): boolean {
  const key   = `${bucket}:${ip}`;
  const limit = LIMITS[bucket].max;
  const now   = Date.now();

  let entry = store.get(key);
  if (!entry) {
    entry = { timestamps: [] };
    store.set(key, entry);
  }

  // Slide the window: drop timestamps older than WINDOW_MS
  entry.timestamps = entry.timestamps.filter((t) => now - t < WINDOW_MS);

  if (entry.timestamps.length >= limit) {
    return true;
  }

  entry.timestamps.push(now);
  return false;
}

// Prune the store occasionally to avoid unbounded growth.
// Using a counter is simpler than setInterval (which is unavailable in Edge).
let pruneCounter = 0;
function maybePruneStore(): void {
  pruneCounter++;
  if (pruneCounter % 500 !== 0) return;
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    entry.timestamps = entry.timestamps.filter((t) => now - t < WINDOW_MS);
    if (entry.timestamps.length === 0) store.delete(key);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper — resolve client IP from standard headers set by Vercel / proxies
// ─────────────────────────────────────────────────────────────────────────────

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-real-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Route classification
// ─────────────────────────────────────────────────────────────────────────────

/** Routes that require an authenticated session (redirect to login if not). */
const PROTECTED_PREFIXES = [
  "/events",
  "/settings",
  "/participants",
  "/analytics",
  "/emails",
  "/hospitality",
  "/hotels",
  "/organization",
  "/account",
  "/ai-integrations",
  "/phorma",
];

const PROTECTED_API_PREFIXES = [
  "/api/events",
  "/api/participants",
  "/api/org",
  "/api/checkin",
  "/api/invite",
];

/** Auth / registration endpoints get a stricter rate limit. */
const AUTH_API_PREFIXES = ["/api/auth", "/api/register"];

// ─────────────────────────────────────────────────────────────────────────────
// Middleware
// ─────────────────────────────────────────────────────────────────────────────

export function middleware(req: NextRequest): NextResponse {
  maybePruneStore();

  const { pathname } = req.nextUrl;
  const ip = getClientIp(req);

  // ── Rate limiting ───────────────────────────────────────────────────────────

  const isAuthRoute = AUTH_API_PREFIXES.some((p) => pathname.startsWith(p));
  const isApiRoute  = pathname.startsWith("/api/");

  if (isAuthRoute) {
    if (isRateLimited(ip, "auth")) {
      return new NextResponse(
        JSON.stringify({ error: "Troppe richieste. Riprova tra un minuto." }),
        {
          status: 429,
          headers: {
            "Content-Type":  "application/json",
            "Retry-After":   "60",
            "X-RateLimit-Limit":     String(LIMITS.auth.max),
            "X-RateLimit-Remaining": "0",
          },
        }
      );
    }
  } else if (isApiRoute) {
    if (isRateLimited(ip, "general")) {
      return new NextResponse(
        JSON.stringify({ error: "Troppe richieste. Riprova tra un minuto." }),
        {
          status: 429,
          headers: {
            "Content-Type":  "application/json",
            "Retry-After":   "60",
            "X-RateLimit-Limit":     String(LIMITS.general.max),
            "X-RateLimit-Remaining": "0",
          },
        }
      );
    }
  }

  // ── Protected page routes — redirect to login if no session cookie ──────────

  const isProtectedPage = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  if (isProtectedPage) {
    // NextAuth 5 sets a session cookie named "authjs.session-token" (or
    // "__Secure-authjs.session-token" in production with HTTPS).
    const sessionCookie =
      req.cookies.get("authjs.session-token") ??
      req.cookies.get("__Secure-authjs.session-token");

    if (!sessionCookie) {
      const loginUrl = new URL("/auth/login", req.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // ── Protected API routes — return 401 if no session cookie ─────────────────

  const isProtectedApi = PROTECTED_API_PREFIXES.some((p) => pathname.startsWith(p));
  if (isProtectedApi) {
    const sessionCookie =
      req.cookies.get("authjs.session-token") ??
      req.cookies.get("__Secure-authjs.session-token");

    if (!sessionCookie) {
      return new NextResponse(
        JSON.stringify({ error: "Non autorizzato" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all paths EXCEPT:
     * - _next/static (static files)
     * - _next/image  (image optimisation)
     * - favicon.ico
     * - Public registration form and public pages
     */
    "/((?!_next/static|_next/image|favicon.ico|register/|auth/|unsubscribe|privacy|terms|not-found|error).*)",
  ],
};
