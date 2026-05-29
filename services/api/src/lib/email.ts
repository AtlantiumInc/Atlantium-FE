import type { Env } from "../env";

export async function sendOtpEmail(env: Env, email: string, code: string) {
  if (!env.RESEND_API_KEY) {
    console.log(`[Atlantium OTP] ${email}: ${code}`);
    return { sent: false, provider: "console" as const };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.RESEND_FROM || "Atlantium <hello@atlantium.ai>",
      to: email,
      subject: "Your Atlantium verification code",
      text: `Your Atlantium verification code is ${code}. It expires in 10 minutes.`,
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Failed to send OTP email: ${response.status} ${text.slice(0, 160)}`);
  }

  return { sent: true, provider: "resend" as const };
}
