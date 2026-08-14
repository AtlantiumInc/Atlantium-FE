import type { Env } from "../env";

/**
 * The service registry — which things can be requested, and what each one asks.
 *
 * `kind` in service_requests is validated against these keys. Adding a service
 * is one entry here (plus its form fields on the web side): no enum migration,
 * no new table. The pipeline — new → called → offered → paid — is shared by
 * every entry, because everything here is sold the same way: on a phone call,
 * price set in conversation, paid in full by link.
 */
export type ServiceDef = {
  title: string;
  /** Product name shown on the Stripe checkout page. */
  productName: string;
  /** Question keys we accept into `answers` (anything else is dropped). */
  questions: readonly string[];
  notifySubject: string;
};

export const SERVICES: Record<string, ServiceDef> = {
  ai_engineering_cohort: {
    title: "AI Engineering Intensive",
    productName: "Atlantium — AI Engineering Intensive (Cohort 1)",
    questions: ["current_role", "goal", "experience", "commitment", "heard_from"],
    notifySubject: "Training application",
  },
};

/** New-lead alert, so the call happens while they're still on the site. */
export async function notifyServiceRequest(
  env: Env,
  input: { kind: string; name: string; email: string; phone: string | null; answers: Record<string, unknown> },
) {
  const service = SERVICES[input.kind];
  const to = env.SERVICE_REQUEST_NOTIFY_EMAIL || "team@atlantium.ai";
  const lines = [
    `${input.name} <${input.email}>`,
    `Phone: ${input.phone ?? "not given"}`,
    "",
    ...Object.entries(input.answers).map(([k, v]) => `${k.replace(/_/g, " ")}: ${String(v)}`),
    "",
    `Review: https://atlantium.ai/admin/services`,
  ];

  if (!env.RESEND_API_KEY) {
    console.log(`[service-request] ${service?.title ?? input.kind}: ${lines.join(" | ")}`);
    return { sent: false as const };
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: env.RESEND_FROM || "Atlantium <hello@atlantium.ai>",
      to,
      subject: `${service?.notifySubject ?? "Service request"}: ${input.name}`,
      text: lines.join("\n"),
    }),
  });
  // A lost alert must not lose the application — the row is already saved.
  if (!res.ok) console.error(`service-request notify failed: ${res.status}`);
  return { sent: res.ok };
}
