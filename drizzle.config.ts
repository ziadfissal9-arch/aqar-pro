import { defineConfig } from "drizzle-kit";

// `db:generate` only reads the schema; scripts/migrate.ts applies the SQL to Neon.
export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
});
