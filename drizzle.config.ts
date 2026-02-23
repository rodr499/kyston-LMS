import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// Load .env.local (Next.js) then .env so drizzle-kit sees DATABASE_URL
config({ path: ".env.local" });
config();

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
