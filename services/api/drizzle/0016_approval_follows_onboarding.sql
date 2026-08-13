-- Approval is earned by finishing the questionnaire, so a brand-new signup must
-- not start out approved. (An earlier pass set this default to true; the rule
-- has since moved to "approval follows onboarding", granted by the API when the
-- questionnaire is submitted.)
--
-- Existing rows are deliberately left alone: every member-value endpoint checks
-- the questionnaire independently, so flipping historical accounts would change
-- nothing functionally while risking a surprise lockout.

ALTER TABLE "user" ALTER COLUMN "is_approved" SET DEFAULT false;
