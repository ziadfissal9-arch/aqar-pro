// Applies the SQL migrations in ./drizzle to Neon, then seeds the default landmarks once.
import { neon } from "@neondatabase/serverless";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";
import { landmarks } from "../src/db/schema";
import { DEFAULT_LANDMARKS } from "../src/lib/landmarks";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const db = drizzle(neon(url));
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("Migrations applied.");

  const [{ count }] = (await db.execute(sql`select count(*)::int as count from landmarks`)).rows as { count: number }[];
  if (count === 0) {
    await db.insert(landmarks).values(DEFAULT_LANDMARKS.map((l, i) => ({ ...l, sortOrder: i })));
    console.log(`Seeded ${DEFAULT_LANDMARKS.length} landmarks.`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
