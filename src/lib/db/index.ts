import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL!;

// Use Supabase "Transaction" pooler (port 6543) in DATABASE_URL to avoid MaxClientsInSessionMode.
const client = postgres(connectionString, {
  max: 1,
  idle_timeout: 0,
  connect_timeout: 10,
});

export const db = drizzle(client, { schema });
export * from "./schema";
