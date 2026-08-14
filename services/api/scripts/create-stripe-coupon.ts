/**
 * Create a discount coupon + a customer-facing promotion code.
 *
 * Checkout already sends `allow_promotion_codes: true`, so whatever this
 * prints works at the payment page with no code change.
 *
 *   # $1 first month (default): $28 off the $29 monthly, once
 *   STRIPE_SECRET_KEY=rk_... npx tsx scripts/create-stripe-coupon.ts --live
 *
 *   # a true 99% off instead ($29 → $0.29)
 *   STRIPE_SECRET_KEY=rk_... npx tsx scripts/create-stripe-coupon.ts --live --percent 99
 *
 *   # name the code yourself, and let it repeat rather than apply once
 *   ... --code FOUNDER1 --forever
 */
const KEY = process.env.STRIPE_SECRET_KEY;
if (!KEY) {
  console.error("STRIPE_SECRET_KEY is not set. Pass it inline so it stays out of your history:");
  console.error("  STRIPE_SECRET_KEY=rk_... npx tsx scripts/create-stripe-coupon.ts --live");
  process.exit(1);
}

const argv = process.argv;
const flag = (name: string) => argv.includes(`--${name}`);
const value = (name: string) => {
  const i = argv.indexOf(`--${name}`);
  return i === -1 ? undefined : argv[i + 1];
};

const WANT_LIVE = flag("live");
const CODE = (value("code") ?? "FOUNDER1").toUpperCase();
const PERCENT = value("percent") ? Number(value("percent")) : undefined;
// Default: $28 off the $29 plan — a literal $1 first payment. "99% off" of $29
// is $0.29, which is probably not what "a dollar" means, so it's opt-in.
const AMOUNT_OFF_CENTS = Number(value("amount-off") ?? 2800);
const DURATION = flag("forever") ? "forever" : "once";
const MAX_REDEMPTIONS = value("max") ? Number(value("max")) : undefined;

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
  const isLive = !KEY!.includes("_test_");
  if (isLive && !WANT_LIVE) {
    console.error("That is a LIVE key — this coupon would be redeemable against real money.");
    console.error("Re-run with --live if that's what you intend.");
    process.exit(1);
  }

  const params = new URLSearchParams({
    duration: DURATION,
    name: PERCENT ? `${PERCENT}% off` : `$${(AMOUNT_OFF_CENTS / 100).toFixed(2)} off`,
  });
  if (PERCENT) {
    params.set("percent_off", String(PERCENT));
  } else {
    params.set("amount_off", String(AMOUNT_OFF_CENTS));
    params.set("currency", "usd");
  }

  const coupon = await stripe<{ id: string; name: string }>("/coupons", params);

  // The coupon is the discount; the promotion code is the thing a human types.
  const promoParams = new URLSearchParams({ coupon: coupon.id, code: CODE });
  if (MAX_REDEMPTIONS) promoParams.set("max_redemptions", String(MAX_REDEMPTIONS));
  const promo = await stripe<{ id: string; code: string; active: boolean }>("/promotion_codes", promoParams);

  const monthly = 2900;
  const firstPayment = PERCENT
    ? Math.round(monthly * (1 - PERCENT / 100))
    : Math.max(0, monthly - AMOUNT_OFF_CENTS);

  console.log(`\n${isLive ? "LIVE" : "TEST"} mode\n`);
  console.log(`  coupon:          ${coupon.id} (${coupon.name})`);
  console.log(`  promotion code:  ${promo.code}   ← give this to people`);
  console.log(`  applies:         ${DURATION === "once" ? "first payment only" : "every payment"}`);
  console.log(`  on $29/mo:       $${(firstPayment / 100).toFixed(2)}${DURATION === "once" ? " first month, then $29" : " every month"}`);
  if (MAX_REDEMPTIONS) console.log(`  max redemptions: ${MAX_REDEMPTIONS}`);
  console.log(`\nRedeem it at checkout — "Add promotion code" is already enabled.\n`);
}

main().catch((e) => { console.error(String(e.message ?? e)); process.exit(1); });
