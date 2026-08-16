-- 0028: Education level on the professional persona (task #23 hub). The Head
-- Hunter Program's "qualified candidate" criterion — bachelor's or higher —
-- derives from the onboarding forms, so the forms must ask. Text + app-side
-- enum (high_school | associate | bachelors | masters | doctorate) per house
-- rule; NULL = not answered (never assumed).
ALTER TABLE "role_details" ADD COLUMN "education" text;
