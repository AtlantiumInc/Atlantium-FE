import { Hono } from "hono";
import { cors } from "hono/cors";
import { createAuth } from "./lib/auth";
import type { Env } from "./env";
import { allowedOrigins } from "./env";
import { jsonError } from "./lib/http";
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

app.on(["GET", "POST"], "/api/auth/*", (c) => createAuth(c.env, getExecutionCtx(c)).handler(c.req.raw));
app.route("/v1", appRoutes);

app.notFound((c) => c.json({ code: "not_found", message: "Route not found.", path: c.req.path }, 404));
app.onError((error, c) => jsonError(c, error));

export default app;

function getExecutionCtx(c: { executionCtx: ExecutionContext }) {
  try {
    return c.executionCtx;
  } catch {
    return undefined;
  }
}
