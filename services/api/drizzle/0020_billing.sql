-- P1b — Billing (plan §6.5). Stripe is the source of truth for subscription
-- state; `memberships` is our projection of it, and entitlements read only the
-- projection.

ALTER TABLE memberships
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
  ADD COLUMN IF NOT EXISTS stripe_price_id text;

CREATE UNIQUE INDEX IF NOT EXISTS memberships_stripe_customer_uq
  ON memberships (stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS memberships_stripe_subscription_uq
  ON memberships (stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;

-- Stripe retries webhooks, and retries are not rare — they are the normal
-- consequence of any slow or failed response. Processing an event twice would
-- double-apply state, so every event is recorded before it is acted on and the
-- primary key is what makes replay a no-op.
CREATE TABLE IF NOT EXISTS billing_events (
  id           text PRIMARY KEY,          -- Stripe's event id
  type         text NOT NULL,
  received_at  timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  payload      jsonb NOT NULL DEFAULT '{}'::jsonb,
  error        text
);

CREATE INDEX IF NOT EXISTS billing_events_type_idx ON billing_events (type, received_at DESC);
