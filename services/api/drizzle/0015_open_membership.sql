-- Membership opens up, but the questionnaire becomes the gate:
--  1. no admin review queue — approval is granted the moment a member
--     completes the questionnaire (handled in the API layer)
--  2. published content is public; reading is the top of the funnel, not the
--     product
--  3. member VALUE (apply links, contact reveals, the lab) requires a completed
--     questionnaire, enforced server-side
--
-- is_approved keeps its `false` default: a signup that never answers the
-- questionnaire never becomes an approved member.

-- Anyone who already finished the questionnaire is approved retroactively —
-- they earned it under the old rules and shouldn't be stuck behind the queue.
UPDATE "user" SET "is_approved" = true, "updated_at" = now()
WHERE "is_approved" = false
  AND "id" IN (
    SELECT "owner_user_id" FROM "profiles"
    WHERE "onboarding_completed_at" IS NOT NULL
       OR "registration_details"->>'is_completed' = 'true'
  );

ALTER TABLE "content_documents" ALTER COLUMN "gate" SET DEFAULT 'public';

UPDATE "content_documents" SET "gate" = 'public', "updated_at" = now() WHERE "gate" <> 'public';
