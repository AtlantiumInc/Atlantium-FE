import type { Env } from "../env";

/**
 * The founder's welcome — sent once, when a member completes onboarding.
 *
 * Plain text on purpose: it's a note from a person, not a campaign. The body
 * is built from what they just told us — persona, what they're working on,
 * what they said they need — so it reads like someone actually looked at
 * their answers. Founders/professionals/hiring get the fully specific
 * version; investors and advisors get a lighter one with context.
 *
 * From is the verified domain (Resend can't send as gmail.com); Reply-To is
 * the founder's real inbox, so answering it starts an actual conversation.
 */
type WelcomeInput = {
  name: string;
  branch: string | null;
  headline: string | null;
  needs: string[];
  seeking: string | null;
  orgNamed: boolean;
};

export function buildWelcomeEmail(input: WelcomeInput): { subject: string; text: string } {
  const first = input.name.split(/\s+/)[0] || "there";
  const workingOn = input.headline?.trim()
    ? `\n\nYou said you're working on: "${input.headline.trim()}" — I read every one of these.`
    : "";

  const NEED_WORDS: Record<string, string> = {
    customers: "customers",
    hires: "people to hire",
    capital: "capital",
    advice: "someone who's done this before",
    cofounder: "a cofounder",
  };

  let subject = "Welcome to Atlantium";
  let body: string;

  switch (input.branch) {
    case "founder": {
      const needs = input.needs.map((n) => NEED_WORDS[n] ?? n).join(", ");
      const needsLine = needs
        ? `You told us what you need this quarter — ${needs}. That's exactly what I use to decide who to put in front of you, so it wasn't a throwaway question.`
        : `When you know what you need this quarter, tell me — that's what I use to decide who to put in front of you.`;
      const claimLine = input.orgNamed
        ? `\n\nYour company claim is in my review queue. Once it's approved you'll carry the verified badge, and reaching people as its founder unlocks.`
        : "";
      subject = "Welcome to Atlantium — read this one";
      body = `${first} — Kleveland here. I run Atlantium.${workingOn}\n\n${needsLine}${claimLine}\n\nStart with the lobby and the directory — the map of Atlanta tech is open to you. And when you hit a wall, reply to this email. I answer.`;
      break;
    }
    case "professional": {
      const seekingLine =
        input.seeking === "actively_looking"
          ? `You said you're actively looking. That signal stays exactly as private as you set it — nobody gets to see it who you didn't allow. The job board's apply links are open to you now, and the Weekly Job Report is on its way.`
          : input.seeking === "open"
            ? `You said you'd listen for the right thing. We treat that signal carefully — it's only visible the way you set it, and we never widen it.`
            : `The job board and every doc in the lab are open to you now — and if you ever flip to looking, that signal stays as private as you choose.`;
      subject = "Welcome to Atlantium";
      body = `${first} — Kleveland here. I run Atlantium.${workingOn}\n\n${seekingLine}\n\nIf you're pushing toward AI engineering work, look at the 8-week intensive on /training — it's the fastest door we have. Reply to this email any time; it's really me.`;
      break;
    }
    case "hiring": {
      const claimLine = input.orgNamed
        ? `Your company claim is in my review queue — once approved, your roles reach members as a verified company, not a stranger's post.`
        : `Claim your company when you get a minute (it's under your profile menu) — verified companies are the only ones whose roles reach members directly.`;
      subject = "Welcome to Atlantium";
      body = `${first} — Kleveland here. I run Atlantium.${workingOn}\n\n${claimLine}\n\nThe people you're trying to hire are the ones reading our job board and going through our training. Tell me what you're hiring for — reply right here — and I'll tell you honestly whether we have them.`;
      break;
    }
    case "investor": {
      subject = "Welcome to Atlantium";
      body = `${first} — Kleveland here. I run Atlantium, Atlanta's citizen technology lab.${workingOn}\n\nThe short version of how we treat investors: nothing reaches you unscreened. If you told us you want founder introductions, I read every one before it gets near your inbox — my judgment is the product. If you said not yet, nobody will cold-call you here.\n\nHave a look around the directory and the lobby. Reply to this email if anything's worth a conversation — it comes straight to me.`;
      break;
    }
    case "advisor": {
      subject = "Welcome to Atlantium";
      body = `${first} — Kleveland here. I run Atlantium, Atlanta's citizen technology lab.${workingOn}\n\nAdvisors are the quiet engine of this network — the people founders actually need to talk to. However you set your availability, we honor it: nobody reaches you outside the door you left open.\n\nHave a look at the lobby and the directory, and reply to this email any time. It's really me on the other end.`;
      break;
    }
    default: {
      subject = "Welcome to Atlantium";
      body = `${first} — Kleveland here. I run Atlantium, Atlanta's citizen technology lab.${workingOn}\n\nEverything the lab publishes — the docs, the job board, the directories — is open to you now. The lobby is where members actually talk.\n\nReply to this email any time. It's really me on the other end.`;
    }
  }

  return { subject, text: `${body}\n\n— Kleveland\nAtlantium · atlantium.ai` };
}

export async function sendWelcomeEmail(
  env: Env,
  to: string,
  input: WelcomeInput,
): Promise<{ sent: boolean; provider: "resend" | "console" }> {
  const { subject, text } = buildWelcomeEmail(input);
  if (!env.RESEND_API_KEY) {
    console.log(`[welcome-email:console] to=${to} subject="${subject}"\n${text}`);
    return { sent: false, provider: "console" };
  }
  // Send from whatever domain is actually verified in Resend (today that's
  // notifications.atlantium.ai — the OTP sender proves it works). A hardcoded
  // pretty domain 403s and the welcome silently never goes out.
  const domain = env.RESEND_FROM?.match(/@([^>\s]+)/)?.[1] ?? "notifications.atlantium.ai";
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: `Kleveland Bishop <kleveland@${domain}>`,
      reply_to: "kleveland.bishop@gmail.com",
      to,
      subject,
      text,
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error(`welcome email failed: ${res.status} ${detail.slice(0, 160)}`);
    return { sent: false, provider: "resend" };
  }
  return { sent: true, provider: "resend" };
}
