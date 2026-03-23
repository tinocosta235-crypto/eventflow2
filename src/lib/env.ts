/**
 * Environment variable validation.
 * Import this at the top of server entry points to catch misconfiguration early.
 */

const REQUIRED_ENV: ReadonlyArray<string> = [
  "DATABASE_URL",
  "NEXTAUTH_SECRET",
  "NEXTAUTH_URL",
  "RESEND_API_KEY",
  "ANTHROPIC_API_KEY",
];

function validateEnv(): void {
  const missing = REQUIRED_ENV.filter((key) => !process.env[key]);

  if (missing.length === 0) return;

  const message = `[env] Missing required environment variables: ${missing.join(", ")}`;

  if (process.env.NODE_ENV === "production") {
    throw new Error(message);
  } else {
    console.warn(message);
  }
}

// Run on module load (server-side only)
validateEnv();

export { validateEnv };
