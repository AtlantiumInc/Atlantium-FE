import type { Context } from "hono";

export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: Record<string, unknown>,
  ) {
    super(message);
  }
}

export function jsonError(c: Context, error: unknown) {
  if (error instanceof HttpError) {
    return c.json(
      {
        code: error.code,
        message: error.message,
        ...(error.details ? { details: error.details } : {}),
      },
      error.status as never,
    );
  }

  const message = error instanceof Error ? error.message : "Unexpected error";
  console.error("Unhandled request error", error);
  return c.json({ code: "internal_error", message }, 500);
}
