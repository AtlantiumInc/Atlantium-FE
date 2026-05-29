import { neon } from "@neondatabase/serverless";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required.");

const sql = neon(databaseUrl);

await sql.query(`
  CREATE TABLE IF NOT EXISTS "schema_migrations" (
    "name" text PRIMARY KEY,
    "applied_at" timestamp with time zone DEFAULT now() NOT NULL
  )
`);

const files = (await readdir(join(process.cwd(), "drizzle")))
  .filter((file) => file.endsWith(".sql"))
  .sort();

for (const file of files) {
  const [existing] = await sql.query(`SELECT "name" FROM "schema_migrations" WHERE "name" = $1`, [file]) as Array<{ name: string }>;
  if (existing) {
    console.log(`Skipped migration ${file}`);
    continue;
  }
  const migration = await readFile(join(process.cwd(), "drizzle", file), "utf8");
  const statements = splitSql(migration);
  for (const statement of statements) await sql.query(statement);
  await sql.query(`INSERT INTO "schema_migrations" ("name") VALUES ($1)`, [file]);
  console.log(`Applied migration ${file} (${statements.length} statements)`);
}

function splitSql(input: string) {
  return input
    .replaceAll("--> statement-breakpoint", ";")
    .split(/;\s*(?:\r?\n|$)/)
    .map((statement) => statement.trim())
    .filter(Boolean);
}
