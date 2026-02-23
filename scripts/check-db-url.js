/**
 * Run: node scripts/check-db-url.js
 * Loads .env.local and prints whether DATABASE_URL is set and its format (password hidden).
 * Use this to confirm the right URL is loaded before running db:push.
 */
require("dotenv").config({ path: ".env.local" });
require("dotenv").config();

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set. Check .env.local.");
  process.exit(1);
}

try {
  const parsed = new URL(url);
  const masked = `${parsed.protocol}//${parsed.username}:***@${parsed.hostname}:${parsed.port || "5432"}${parsed.pathname}`;
  console.log("DATABASE_URL is set.");
  console.log("Masked URL:", masked);
  console.log("Host:", parsed.hostname);
  console.log("User:", parsed.username);
  console.log("Port:", parsed.port || "5432");
  if (!parsed.password) {
    console.error("\nWarning: No password in URL (password is empty).");
    process.exit(1);
  }
  if (parsed.username.includes("[YOUR-PASSWORD]") || parsed.password === "[YOUR-PASSWORD]") {
    console.error("\nWarning: You still have [YOUR-PASSWORD] in the URL. Replace with your real database password.");
    process.exit(1);
  }
} catch (e) {
  console.error("DATABASE_URL is not a valid URL:", e.message);
  process.exit(1);
}
