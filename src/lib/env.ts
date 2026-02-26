/**
 * Validates required environment variables at module load time.
 * Import this file in your root layout or instrumentation.ts to catch
 * missing config before the first request is served.
 */

const REQUIRED_ENV_VARS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "DATABASE_URL",
] as const;

const REQUIRED_SERVER_ENV_VARS = [
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
] as const;

function validateEnv() {
  const missing: string[] = [];

  for (const key of REQUIRED_ENV_VARS) {
    if (!process.env[key]) missing.push(key);
  }

  // Server-only vars — only checked outside the browser bundle
  if (typeof window === "undefined") {
    for (const key of REQUIRED_SERVER_ENV_VARS) {
      if (!process.env[key]) missing.push(key);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables:\n${missing.map((k) => `  - ${k}`).join("\n")}\n\nCopy env.example to .env.local and fill in the values.`
    );
  }
}

validateEnv();
