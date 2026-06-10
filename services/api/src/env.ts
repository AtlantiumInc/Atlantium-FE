export type Env = {
  DATABASE_URL: string;
  BETTER_AUTH_SECRET: string;
  HANDOFF_SIGNING_SECRET: string;
  APP_BASE_URL?: string;
  AUTH_BASE_URL?: string;
  ALLOWED_ORIGINS?: string;
  RESEND_API_KEY?: string;
  RESEND_FROM?: string;
  DEBUG_AUTH_CODES?: string;
  ADMIN_EMAILS?: string;
  BOOMIN_CONNECT_PUBLIC_KEY?: string;
  BOOMIN_CONNECT_PROGRAM_ID?: string;
  BOOMIN_CONNECT_API_BASE?: string;
  BOOMIN_HANDOFF_REDIRECT_URI?: string;
  BOOMIN_APP_API_BASE?: string;
  BOOMIN_APP_STANDING_EMAIL?: string;
  BOOMIN_APP_STANDING_PROGRAM_ID?: string;
  LIVEKIT_URL?: string;
  LIVEKIT_API_KEY?: string;
  LIVEKIT_API_SECRET?: string;
};

export function allowedOrigins(env: Env) {
  const raw = env.ALLOWED_ORIGINS || "https://atlantium.ai,http://localhost:5173,http://localhost:4173";
  return raw
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export function requireEnv(env: Env, key: keyof Env) {
  const value = env[key];
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
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
