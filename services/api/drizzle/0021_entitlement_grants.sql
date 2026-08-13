-- Comped capabilities (plan §6.4). Entitlements can be granted directly, not
-- only bought — investors are comped by design, and founding members are
-- comped at launch while live billing is still deferred.
--
-- Deliberately separate from `memberships`: a comp is not a subscription, and
-- writing a fake paid tier would corrupt every revenue number we ever read.

CREATE TABLE IF NOT EXISTS entitlement_grants (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  entitlement    text NOT NULL,
  reason         text NOT NULL,
  granted_by     text REFERENCES "user"(id) ON DELETE SET NULL,
  granted_at     timestamptz NOT NULL DEFAULT now(),
  -- Comps are DATED. An undated comp is indistinguishable from a pricing
  -- decision nobody remembers making.
  expires_at     timestamptz,
  revoked_at     timestamptz,
  revoked_reason text
);

CREATE INDEX IF NOT EXISTS entitlement_grants_user_idx
  ON entitlement_grants (user_id) WHERE revoked_at IS NULL;
