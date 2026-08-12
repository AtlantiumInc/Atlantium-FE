-- Quota accounting separated from unlock records.
--
-- Why: the advisory-lock + count-then-insert statement is NOT safe under
-- READ COMMITTED. A single statement takes its snapshot at statement start,
-- BEFORE it blocks on pg_advisory_xact_lock, so serialized callers still count
-- a stale set of rows. An 8-way concurrent burst let 6 reveals through a
-- quota of 5.
--
-- An UPDATE with the guard in its WHERE clause is safe: the row lock plus
-- READ COMMITTED's EvalPlanQual re-check makes each blocked updater re-test
-- `used < quota` against the newly committed row version.
--
-- directory_reveals keeps its role as the PERMANENT unlock record (entry-level
-- unlock is forever); this table is only the rolling budget.
CREATE TABLE IF NOT EXISTS directory_reveal_budgets (
  user_id text PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
  window_start timestamptz NOT NULL DEFAULT now(),
  used int NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
