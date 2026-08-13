-- Free membership opens up:
--  1. signups are auto-approved (the admin queue stays for revoking, not admitting)
--  2. published content is public — reading is the top of the funnel, not the product
--  3. member VALUE (apply links, contact reveals, the lab) now requires the
--     questionnaire instead, which is enforced in the API layer.

ALTER TABLE "user" ALTER COLUMN "is_approved" SET DEFAULT true;

-- Everyone waiting under the old policy is admitted; they applied in good faith.
UPDATE "user" SET "is_approved" = true, "updated_at" = now() WHERE "is_approved" = false;

ALTER TABLE "content_documents" ALTER COLUMN "gate" SET DEFAULT 'public';

UPDATE "content_documents" SET "gate" = 'public', "updated_at" = now() WHERE "gate" <> 'public';
