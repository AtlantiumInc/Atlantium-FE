import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { emailOTP } from "better-auth/plugins";
import { createDb } from "../db/client";
import * as schema from "../db/schema";
import type { Env } from "../env";
import { allowedOrigins, requireEnv } from "../env";
import { sendOtpEmail } from "./email";

export function createAuth(env: Env, executionCtx?: ExecutionContext) {
  const db = createDb(env);
  return betterAuth({
    baseURL: env.AUTH_BASE_URL || "https://api.atlantium.ai",
    basePath: "/api/auth",
    secret: requireEnv(env, "BETTER_AUTH_SECRET"),
    trustedOrigins: allowedOrigins(env),
    database: drizzleAdapter(db, {
      provider: "pg",
      schema,
    }),
    emailAndPassword: {
      enabled: false,
    },
    plugins: [
      emailOTP({
        otpLength: 6,
        expiresIn: 10 * 60,
        allowedAttempts: 5,
        storeOTP: "plain",
        sendVerificationOTP: async ({ email, otp }) => {
          const task = sendOtpEmail(env, email, otp).then(() => undefined);
          if (executionCtx) {
            executionCtx.waitUntil(task);
            return;
          }
          await task;
        },
      }),
    ],
    session: {
      cookieCache: {
        enabled: true,
        maxAge: 5 * 60,
      },
    },
    advanced: {
      defaultCookieAttributes: {
        sameSite: "lax",
        secure: (env.AUTH_BASE_URL || "https://api.atlantium.ai").startsWith("https://"),
        httpOnly: true,
      },
    },
  });
}

export async function getAuthSession(env: Env, request: Request) {
  return createAuth(env).api.getSession({ headers: request.headers });
}
