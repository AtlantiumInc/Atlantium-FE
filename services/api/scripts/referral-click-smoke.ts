// Referral click smoke: proves affiliate link clicks register in the Boomin
// program regardless of where the link was shared (Instagram, Telegram,
// Discord — any HTTP GET on the public click-through).
//
// Usage:
//   REFERRAL_CODE=<member referral code> npx tsx scripts/referral-click-smoke.ts
// Optional:
//   CLICK_BASE (default https://api.atlantium.ai/v1/r)
//   BOOMIN_DATABASE_URL — Boomin prod Neon URL; when set, verifies the metric
//   events + rollup actually landed instead of only checking the redirect.

export {};

const code = process.env.REFERRAL_CODE;
if (!code) {
  console.error("REFERRAL_CODE is required.");
  process.exit(1);
}
const base = (process.env.CLICK_BASE || "https://api.atlantium.ai/v1/r").replace(/\/+$/, "");

// One click per share-channel an affiliate actually uses.
const sources = [
  { utm_source: "instagram", referer: "https://l.instagram.com/", ua: "Instagram 300.0 (iPhone)" },
  { utm_source: "telegram", referer: "https://t.me/atlantium_builders", ua: "TelegramBot (like TwitterBot)" },
  { utm_source: "discord", referer: "https://discord.com/channels/@me", ua: "Mozilla/5.0 (Discord client)" },
];

const results: Array<{ source: string; status: number; location: string | null }> = [];
for (const source of sources) {
  const url = `${base}/${encodeURIComponent(code)}?utm_source=${source.utm_source}&utm_medium=social`;
  const response = await fetch(url, {
    redirect: "manual",
    headers: { referer: source.referer, "user-agent": source.ua },
  });
  results.push({ source: source.utm_source, status: response.status, location: response.headers.get("location") });
}
console.log("clicks:", JSON.stringify(results, null, 2));

const redirected = results.every((r) => r.status === 302 && r.location?.includes(`ref=${encodeURIComponent(code)}`));
if (!redirected) {
  console.error("FAIL: click-through did not 302 with ref param for every source.");
  process.exit(1);
}

if (process.env.BOOMIN_DATABASE_URL) {
  // Verify server-side registration: events with our utm sources + rollup total.
  const { neon } = await import("@neondatabase/serverless");
  const sql = neon(process.env.BOOMIN_DATABASE_URL);
  const q = async (text: string, params: unknown[]) => {
    const r = await (sql as unknown as { query: (t: string, p: unknown[]) => Promise<unknown> }).query(text, params);
    return Array.isArray(r) ? r : (r as { rows: unknown[] }).rows;
  };
  const events = await q(
    `select metadata->>'utm_source' as utm_source, amount, occurred_at
     from program_metric_events e
     join program_members m on m.id = e.program_member_id
     where m.referral_code = $1 and e.metric_key = 'link_clicks' and e.source = 'referral_click'
       and e.occurred_at > now() - interval '5 minutes'
     order by e.occurred_at desc`,
    [code],
  ) as Array<{ utm_source: string | null }>;
  const rollup = await q(
    `select r.total from program_metric_rollups r
     join program_members m on m.id = r.program_member_id
     where m.referral_code = $1 and r.metric_key = 'link_clicks' and r.window_key = 'all_time'`,
    [code],
  ) as Array<{ total: number }>;
  console.log("registered events (last 5m):", JSON.stringify(events));
  console.log("all_time link_clicks rollup:", JSON.stringify(rollup));
  const seen = new Set(events.map((e) => e.utm_source));
  const missing = sources.map((s) => s.utm_source).filter((s) => !seen.has(s));
  if (missing.length) {
    console.error(`FAIL: sources not registered in Boomin: ${missing.join(", ")}`);
    process.exit(1);
  }
  console.log("PASS: instagram + telegram + discord clicks all registered against the program.");
} else {
  console.log("PASS (redirects only): set BOOMIN_DATABASE_URL to verify server-side registration.");
}
