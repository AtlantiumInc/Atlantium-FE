export type Env = {
  DATABASE_URL: string;
  BETTER_AUTH_SECRET: string;
  HANDOFF_SIGNING_SECRET: string;
  APP_BASE_URL?: string;
  AUTH_BASE_URL?: string;
  ALLOWED_ORIGINS?: string;
  RESEND_API_KEY?: string;
  /** Where new service-request alerts go. Defaults to team@atlantium.ai. */
  SERVICE_REQUEST_NOTIFY_EMAIL?: string;
  RESEND_FROM?: string;
  DEBUG_AUTH_CODES?: string;
  /** Billing (P1b). Set with `wrangler secret put` — never committed. */
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  STRIPE_PRICE_CLUB_MONTHLY?: string;
  STRIPE_PRICE_CLUB_ANNUAL?: string;
  /** Public by design — served to the browser for Elements. */
  STRIPE_PUBLISHABLE_KEY?: string;
  ADMIN_EMAILS?: string;
  BOOMIN_CONNECT_PUBLIC_KEY?: string;
  BOOMIN_CONNECT_PROGRAM_ID?: string;
  BOOMIN_CONNECT_API_BASE?: string;
  BOOMIN_HANDOFF_REDIRECT_URI?: string;
  /** Platform sk_ key (assertions:write + program reads) — a wrangler SECRET,
   *  never a var (vars/secrets share one namespace). Absent = assertion sync,
   *  conversion forwarding, and program cards are INERT. Deploy-order safe. */
  BOOMIN_PLATFORM_SECRET?: string;
  BOOMIN_PLATFORM_API_BASE?: string;
  /** Head Hunter Program surface (task #23 hub) — its own publicKey/program;
   *  the signing secret is a wrangler SECRET. Absent = the hub lists only the
   *  creator program. */
  BOOMIN_HEADHUNTER_PUBLIC_KEY?: string;
  BOOMIN_HEADHUNTER_PROGRAM_ID?: string;
  BOOMIN_HEADHUNTER_SIGNING_SECRET?: string;
  REFERRAL_LANDING_URL?: string;
  BOOMIN_APP_API_BASE?: string;
  BOOMIN_APP_STANDING_EMAIL?: string;
  BOOMIN_APP_STANDING_PROGRAM_ID?: string;
  LIVEKIT_URL?: string;
  LIVEKIT_API_KEY?: string;
  LIVEKIT_API_SECRET?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  ANTHROPIC_API_KEY?: string;
  ATLAS_CLOUD_API_KEY?: string;
  REVIEW_SHARD_LIMIT?: string;
  DIRECTORY_REVEAL_QUOTA?: string;
  ASSETS_BUCKET: R2Bucket;
};

export function allowedOrigins(env: Env) {
  const raw = env.ALLOWED_ORIGINS || "https://atlantium.ai,http://localhost:5173,http://localhost:4173";
  return raw
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export function requireEnv<K extends keyof Env>(env: Env, key: K): NonNullable<Env[K]> {
  const value = env[key];
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value as NonNullable<Env[K]>;
}

export function isDebugAuthCodes(env: Env) {
  return env.DEBUG_AUTH_CODES === "true";
}

export function adminEmails(env: Env) {
  return (env.ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}
