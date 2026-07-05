import app from "../src/index";
import type { Env } from "../src/env";

const required = ["DATABASE_URL", "BETTER_AUTH_SECRET", "HANDOFF_SIGNING_SECRET"] as const;
const env = Object.fromEntries(required.map((key) => [key, process.env[key] || ""])) as unknown as Env;
env.APP_BASE_URL = process.env.APP_BASE_URL || "http://localhost:5173";
env.AUTH_BASE_URL = process.env.AUTH_BASE_URL || "http://127.0.0.1";
env.ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS || "http://localhost:5173,http://localhost:4173";
env.DEBUG_AUTH_CODES = process.env.DEBUG_AUTH_CODES || "true";
env.RESEND_FROM = process.env.RESEND_FROM || "Atlantium <hello@atlantium.ai>";
env.BOOMIN_CONNECT_PUBLIC_KEY = process.env.BOOMIN_CONNECT_PUBLIC_KEY || "pk_live_atlantium_creator_program_63xwon9h";
env.BOOMIN_CONNECT_API_BASE = process.env.BOOMIN_CONNECT_API_BASE || "https://api.boomin.ai/v1/connect";
env.BOOMIN_HANDOFF_REDIRECT_URI = process.env.BOOMIN_HANDOFF_REDIRECT_URI || "http://localhost:5173/creator-program";

for (const key of required) {
  if (!env[key]) throw new Error(`${key} is required.`);
}

const origin = "http://localhost:5173";
const email = `smoke-${Date.now()}@example.com`;

const health = await request("/health");
assert(health.status === 200, "health should return 200");

const otp = await request("/v1/auth/otp", {
  method: "POST",
  headers: { "Content-Type": "application/json", Origin: origin },
  body: JSON.stringify({ email }),
});
assert(otp.status === 200, "otp should return 200");

const codeResponse = await request(`/v1/auth/dev-code?email=${encodeURIComponent(email)}`, {
  headers: { Origin: origin },
});
const codeJson = await codeResponse.json() as { code?: string | null };
assert(Boolean(codeJson.code), "debug code should be available");

const verify = await request("/v1/auth/verify", {
  method: "POST",
  headers: { "Content-Type": "application/json", Origin: origin },
  body: JSON.stringify({ email, code: codeJson.code }),
});
assert(verify.status === 200, `verify should return 200, got ${verify.status}`);
const cookie = verify.headers.get("set-cookie");
assert(Boolean(cookie), "verify should set cookie");
const verifyJson = await verify.json() as { user?: { id?: string; _profile?: { id?: string } } };
assert(Boolean(verifyJson.user?.id), "verify should return user");
assert(Boolean(verifyJson.user?._profile?.id), "verify should return active profile");

const me = await request("/v1/auth/me", {
  headers: { Origin: origin, Cookie: cookie || "" },
});
assert(me.status === 200, `me should return 200, got ${me.status}`);

const profiles = await request("/v1/profiles", {
  headers: { Origin: origin, Cookie: cookie || "" },
});
assert(profiles.status === 200, `profiles should return 200, got ${profiles.status}`);

const handoff = await request("/v1/handoff/current-user", {
  headers: { Origin: origin, Cookie: cookie || "" },
});
assert(handoff.status === 200, `handoff current user should return 200, got ${handoff.status}`);

if (process.env.BOOMIN_HANDOFF_SMOKE === "true") {
  const boominJoin = await request("/v1/handoff/boomin/join?mode=json", {
    headers: { Origin: origin, Cookie: cookie || "" },
  });
  assert(boominJoin.status === 200, `boomin handoff should return 200, got ${boominJoin.status}`);
  const boominJoinJson = await boominJoin.json() as { success?: boolean; boomin?: { sessionId?: string; state?: string } };
  assert(boominJoinJson.success === true, "boomin handoff should report success");
  assert(Boolean(boominJoinJson.boomin?.sessionId), "boomin handoff should return a session id");
  assert(boominJoinJson.boomin?.sessionId === boominJoinJson.boomin?.state, "boomin handoff state should equal session id");

  const boominStatus = await request("/v1/handoff/boomin/status", {
    headers: { Origin: origin, Cookie: cookie || "" },
  });
  assert(boominStatus.status === 200, `boomin handoff status should return 200, got ${boominStatus.status}`);
  const boominStatusJson = await boominStatus.json() as { success?: boolean; boomin?: { sessionId?: string; state?: string; status?: string } };
  assert(boominStatusJson.success === true, "boomin handoff status should report success");
  assert(Boolean(boominStatusJson.boomin?.sessionId), "boomin handoff status should return a session id");
  assert(boominStatusJson.boomin?.sessionId === boominStatusJson.boomin?.state, "boomin handoff status state should equal session id");

  const dashboardCreators = await request("/v1/dashboard/creators", {
    headers: { Origin: origin, Cookie: cookie || "" },
  });
  if (dashboardCreators.status !== 200) {
    throw new Error(`dashboard creators should return 200, got ${dashboardCreators.status}: ${await dashboardCreators.text()}`);
  }
  const dashboardJson = await dashboardCreators.json() as { success?: boolean; partners?: unknown[]; totals?: { total?: number } };
  assert(dashboardJson.success === true, "dashboard creators should report success");
  assert(Array.isArray(dashboardJson.partners), "dashboard creators should return a partner list");
}

console.log("Atlantium API direct smoke passed", { email });

function request(path: string, init?: RequestInit) {
  return app.fetch(new Request(`http://localhost${path}`, init), env);
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
