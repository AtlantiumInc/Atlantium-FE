import { Hono } from "hono";
import { cors } from "hono/cors";
import { createAuth } from "./lib/auth";
import type { Env } from "./env";
import { allowedOrigins } from "./env";
import { jsonError } from "./lib/http";
import { sendWeeklyDigest } from "./lib/digest";
import { runReviewCycle } from "./lib/jobs-review";
import { reconcileAllAssertions } from "./lib/boomin-assertions";
import { createDb } from "./db/client";
import { syncCompaniesFromJobs } from "./lib/companies-sync";
import { syncGrants } from "./lib/grants-sync";
import { syncJobPostings } from "./lib/jobs-sync";
import { appRoutes } from "./routes/app";
import { contentRoutes } from "./routes/content";

const app = new Hono<{ Bindings: Env }>();

app.use(
  "*",
  cors({
    origin: (origin, c) => {
      if (!origin) return allowedOrigins(c.env)[0] || "https://atlantium.ai";
      return allowedOrigins(c.env).includes(origin) ? origin : null;
    },
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
    maxAge: 86400,
  }),
);

app.get("/health", (c) => c.json({
  ok: true,
  service: "atlantium-api",
  ts: new Date().toISOString(),
  env: {
    database: Boolean(c.env.DATABASE_URL),
    auth: Boolean(c.env.BETTER_AUTH_SECRET),
    handoff: Boolean(c.env.HANDOFF_SIGNING_SECRET),
    resend: Boolean(c.env.RESEND_API_KEY),
  },
}));

// better-auth's OAuth state-mismatch path redirects to the API root with
// ?error= — send humans to the app's login page instead of raw JSON.
app.get("/", (c, next) => {
  const error = c.req.query("error");
  if (error) {
    const appBase = c.env.APP_BASE_URL || "https://atlantium.ai";
    return c.redirect(`${appBase}/login?error=${encodeURIComponent(error)}`, 302);
  }
  return next();
});

app.get("/", (c) => c.json({
  ok: true,
  service: "atlantium-api",
  message: "Atlantium API is running.",
  routes: {
    health: "/health",
    app: "/v1",
    auth: "/api/auth",
  },
}));

app.on(["GET", "POST"], "/api/auth/*", (c) => createAuth(c.env, getExecutionCtx(c)).handler(c.req.raw));
app.route("/v1", contentRoutes);
app.route("/v1", appRoutes);

app.notFound((c) => c.json({ code: "not_found", message: "Route not found.", path: c.req.path }, 404));
app.onError((error, c) => jsonError(c, error));

export default {
  fetch: app.fetch,
  // Monday crons: 10:00 UTC rescrapes the job board; 13:00 UTC sends the
  // weekly member digest (jobs + events sections), after fresh data lands.
  async scheduled(event: ScheduledController, env: Env, ctx: ExecutionContext) {
    if (event.cron === "*/30 * * * *") {
      ctx.waitUntil(
        runReviewCycle(env)
          .then((r) => console.log("jobs-review ok", JSON.stringify(r)))
          .catch((error) => {
            console.error("jobs-review failed", error);
            throw error;
          }),
      );
      return;
    }
    if (event.cron === "0 13 * * 1") {
      ctx.waitUntil(
        sendWeeklyDigest(env)
          .then((r) => console.log("digest ok", JSON.stringify(r)))
          .catch((error) => {
            console.error("digest failed", error);
            throw error;
          }),
      );
      return;
    }
    // Nightly Boomin assertion reconcile (plan B1): tenant→Boomin forwards are
    // lossy by acceptance (a waitUntil can die with its worker); a full
    // stateless re-sync heals them — identical state no-ops, changed state
    // appends. Inert without BOOMIN_PLATFORM_SECRET.
    if (event.cron === "0 4 * * *") {
      ctx.waitUntil(
        reconcileAllAssertions(createDb(env), env)
          .then((r) => console.log("boomin-reconcile ok", JSON.stringify(r)))
          .catch((error) => {
            console.error("boomin-reconcile failed", error);
            throw error;
          }),
      );
      return;
    }
    // The daily scrape is an EXPLICIT branch, not the fallthrough — an
    // unguarded default here once meant any new cron silently re-ran the
    // scraper (plan Part B risk note).
    if (event.cron !== "0 10 * * *") {
      console.error("unmatched cron", event.cron);
      return;
    }
    ctx.waitUntil(
      syncJobPostings(env)
        .then((r) => console.log("jobs-sync ok", JSON.stringify(r)))
        // Companies derive from postings, so they sync in sequence after the
        // board refreshes — a new employer's jobs and its directory entry land
        // the same morning, instead of waiting for someone to press a button.
        .then(() => syncCompaniesFromJobs(env))
        .then((r) => console.log("companies-sync ok", JSON.stringify(r)))
        .catch((error) => {
          console.error("jobs-sync failed", error);
          throw error;
        }),
    );
    // Same daily tick refreshes the grants directory and expires anything
    // whose deadline passed in its own timezone.
    ctx.waitUntil(
      syncGrants(env)
        .then((r) => console.log("grants-sync ok", JSON.stringify(r)))
        .catch((error) => console.error("grants-sync failed", error)),
    );
  },
};

function getExecutionCtx(c: { executionCtx: ExecutionContext }) {
  try {
    return c.executionCtx;
  } catch {
    return undefined;
  }
}
