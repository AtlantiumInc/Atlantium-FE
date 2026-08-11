import { Hono } from "hono";
import { cors } from "hono/cors";
import { createAuth } from "./lib/auth";
import type { Env } from "./env";
import { allowedOrigins } from "./env";
import { jsonError } from "./lib/http";
import { syncJobPostings } from "./lib/jobs-sync";
import { appRoutes } from "./routes/app";

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
app.route("/v1", appRoutes);

app.notFound((c) => c.json({ code: "not_found", message: "Route not found.", path: c.req.path }, 404));
app.onError((error, c) => jsonError(c, error));

export default {
  fetch: app.fetch,
  // Weekly hiring.cafe rescrape (cron in wrangler.toml) keeps the job board
  // and its "new this week" badges accurate without a manual seed run.
  async scheduled(event: ScheduledController, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(
      syncJobPostings(env)
        .then((r) => console.log("jobs-sync ok", JSON.stringify(r)))
        .catch((error) => {
          console.error("jobs-sync failed", error);
          throw error;
        }),
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
