import { neon } from "@neondatabase/serverless";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * Target selection.
 *
 * `--prod` and `--dev` read the connection string out of the local env files
 * themselves, so nobody has to splice credentials into a shell command to run a
 * migration. DATABASE_URL still wins when it's set, for CI and one-off branches.
 */
const ENV_FILES: Record<string, string> = { prod: ".dev.vars.main.bak", dev: ".dev.vars" };

async function urlFromEnvFile(target: string) {
  const contents = await readFile(join(process.cwd(), ENV_FILES[target]), "utf8");
  const line = contents.split(/\r?\n/).find((l) => l.trimStart().startsWith("DATABASE_URL="));
  if (!line) throw new Error(`No DATABASE_URL in ${ENV_FILES[target]}`);
  return line.slice(line.indexOf("=") + 1).trim().replace(/^["']|["']$/g, "");
}

const target = process.argv.find((a) => a === "--prod" || a === "--dev")?.slice(2);
const databaseUrl = process.env.DATABASE_URL ?? (target ? await urlFromEnvFile(target) : undefined);
if (!databaseUrl) {
  throw new Error("Pass --prod or --dev (reads the matching env file), or set DATABASE_URL.");
}

// Name the target. A silent prod migration is how you find out afterwards that
// it went to the wrong database.
console.log(`→ ${target ?? "DATABASE_URL"} (${databaseUrl.replace(/\/\/[^@]*@/, "//")})`);

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
