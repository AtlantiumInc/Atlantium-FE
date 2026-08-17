/**
 * Manual USAJOBS backfill/run — same code path as the nightly cron.
 * Reads USAJOBS_API_KEY / USAJOBS_USER_AGENT from the env file.
 *   npx tsx scripts/run-usajobs-sync.ts --prod|--dev
 */
import { syncUsaJobs } from "../src/lib/ats-usajobs";
import { readFile } from "node:fs/promises";
const file = process.argv.includes("--prod") ? ".dev.vars.main.bak" : ".dev.vars";
const vars: Record<string, string> = {};
for (const l of (await readFile(file, "utf8")).split(/\r?\n/)) {
  const i = l.indexOf("=");
  if (i > 0 && !l.trimStart().startsWith("#")) vars[l.slice(0, i).trim()] = l.slice(i + 1).trim().replace(/^["']|["']$/g, "");
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
console.log(JSON.stringify(await syncUsaJobs(vars as any)));
