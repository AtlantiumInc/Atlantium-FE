import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import type { Env } from "../env";
import * as schema from "./schema";

export function createDb(env: Env) {
  return drizzle(neon(env.DATABASE_URL), { schema });
}

export type Db = ReturnType<typeof createDb>;
