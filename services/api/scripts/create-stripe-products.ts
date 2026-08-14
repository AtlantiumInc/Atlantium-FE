/**
 * Create Atlantium's products and prices in Stripe, and print the ids.
 *
 * The key is read from the environment — never passed as an argument (it would
 * land in your shell history) and never handled by anyone but you and Stripe.
 *
 *   # test mode
 *   STRIPE_SECRET_KEY=rk_test_... npx tsx scripts/create-stripe-products.ts
 *
 *   # live mode — charges real cards once wired up, so it needs --live
 *   STRIPE_SECRET_KEY=rk_live_... npx tsx scripts/create-stripe-products.ts --live
 *
 * Idempotent: prices carry a `lookup_key`, so re-running finds what exists
 * instead of creating a second $29 price nobody can tell apart from the first.
 */
const KEY = process.env.STRIPE_SECRET_KEY;
if (!KEY) {
  console.error("STRIPE_SECRET_KEY is not set. Pass it inline so it stays out of your history:");
  console.error("  STRIPE_SECRET_KEY=rk_... npx tsx scripts/create-stripe-products.ts");
  process.exit(1);
}
const WANT_LIVE = process.argv.includes("--live");

const PLANS = [
  {
    lookupKey: "atlantium_club_monthly",
    productName: "Atlantium Club Membership",
    description: "Member DMs, exclusive events, agent access, and the Weekly Job Report.",
    unitAmount: 2900,
    interval: "month" as const,
    envVar: "STRIPE_PRICE_CLUB_MONTHLY",
  },
  {
    lookupKey: "atlantium_club_annual",
    productName: "Atlantium Annual Membership",
    description: "Everything in Club, billed yearly — two months free.",
    unitAmount: 29000,
    interval: "year" as const,
    envVar: "STRIPE_PRICE_CLUB_ANNUAL",
  },
];

async function stripe<T>(path: string, body?: URLSearchParams): Promise<T> {
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    method: body ? "POST" : "GET",
    headers: {
      authorization: `Bearer ${KEY}`,
      ...(body ? { "content-type": "application/x-www-form-urlencoded" } : {}),
    },
    body,
  });
  const json = await res.json() as T & { error?: { message?: string } };
  if (!res.ok) throw new Error(`${path} → ${json?.error?.message ?? res.status}`);
  return json;
}

async function main() {
  // Mode comes from the key itself. Asking /v1/account would be nicer output,
  // but it needs a KYC-read permission unrelated to creating products — a
  // restricted key shouldn't have to be widened for a cosmetic line.
  const isLive = !KEY!.includes("_test_");
  const label = isLive ? "LIVE" : "TEST";

  // Best effort only: skip silently if the key isn't scoped for it.
  let accountLabel = "";
  try {
    const account = await stripe<{ id: string; settings?: { dashboard?: { display_name?: string } } }>("/account");
    accountLabel = account.settings?.dashboard?.display_name ?? account.id;
  } catch {
    accountLabel = "(account name not readable with this key)";
  }
  console.log(`Stripe account: ${accountLabel} — ${label} mode\n`);

  if (isLive && !WANT_LIVE) {
    console.error("That is a LIVE key. Live products mean real charges once checkout is wired.");
    console.error("Re-run with --live if that's what you intend.");
    process.exit(1);
  }
  if (!isLive && WANT_LIVE) {
    console.error("--live passed, but that key is test mode. Nothing created.");
    process.exit(1);
  }

  const results: Array<{ envVar: string; priceId: string }> = [];

  for (const plan of PLANS) {
    // Existing price wins — re-running must never mint a duplicate.
    const existing = await stripe<{ data: Array<{ id: string; unit_amount: number; active: boolean }> }>(
      `/prices?lookup_keys[]=${plan.lookupKey}&active=true&limit=1`,
    );
    if (existing.data[0]) {
      console.log(`  = ${plan.productName}: reusing ${existing.data[0].id} ($${existing.data[0].unit_amount / 100})`);
      results.push({ envVar: plan.envVar, priceId: existing.data[0].id });
      continue;
    }

    const product = await stripe<{ id: string }>("/products", new URLSearchParams({
      name: plan.productName,
      description: plan.description,
    }));
    const price = await stripe<{ id: string }>("/prices", new URLSearchParams({
      product: product.id,
      currency: "usd",
      unit_amount: String(plan.unitAmount),
      "recurring[interval]": plan.interval,
      lookup_key: plan.lookupKey,
    }));
    console.log(`  + ${plan.productName}: ${price.id} ($${plan.unitAmount / 100}/${plan.interval})`);
    results.push({ envVar: plan.envVar, priceId: price.id });
  }

  console.log(`\nPrice ids (${label} mode):\n`);
  for (const r of results) console.log(`  ${r.envVar}=${r.priceId}`);

  console.log(`\nSet them on the deployed worker:\n`);
  for (const r of results) {
    console.log(`  echo -n "${r.priceId}" | npx wrangler secret put ${r.envVar}`);
  }
  console.log(`\n(Price ids aren't secret — piping them just avoids a second prompt.)`);
}

main().catch((e) => { console.error(String(e.message ?? e)); process.exit(1); });
