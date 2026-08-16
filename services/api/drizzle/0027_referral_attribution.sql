-- 0027: Referral attribution (plan Part B, B0). The code a referred visitor
-- arrived with, persisted at first verify — USER-scoped so it survives
-- multi-profile, and first-touch (never overwritten). forwardConversion reads
-- it to attribute paid conversions on Boomin; NULL = organic, forward nothing.
ALTER TABLE "user" ADD COLUMN "referred_by_code" text;
