-- Jobs know where they came from. The nightly hiring.cafe sync expires
-- whatever is missing from ITS feed — without a source column that reaps
-- jobs imported from anywhere else (a16z portfolio board, manual adds)
-- within a day of landing.
ALTER TABLE job_postings ADD COLUMN source text NOT NULL DEFAULT 'hiring_cafe';
