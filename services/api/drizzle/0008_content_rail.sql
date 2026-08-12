-- Content rail: collections + documents (plan §3.1, v2.1)
CREATE TYPE document_type AS ENUM ('doc', 'post');

CREATE TYPE document_format AS ENUM ('article', 'guide', 'reference');

CREATE TYPE document_status AS ENUM ('draft', 'published', 'archived');

CREATE TYPE document_gate AS ENUM ('public', 'preview', 'member');

CREATE TABLE IF NOT EXISTS content_collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  description text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS content_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type document_type NOT NULL,
  format document_format NOT NULL DEFAULT 'article',
  slug text NOT NULL,
  title text NOT NULL,
  excerpt text,
  body_md text NOT NULL DEFAULT '',
  cover_image_url text,
  tags text[] NOT NULL DEFAULT '{}',
  author_profile_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  collection_id uuid REFERENCES content_collections(id) ON DELETE SET NULL,
  sort_order int NOT NULL DEFAULT 0,
  status document_status NOT NULL DEFAULT 'draft',
  gate document_gate NOT NULL DEFAULT 'preview',
  published_at timestamptz,
  meta jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (type, slug)
);

CREATE INDEX IF NOT EXISTS content_documents_type_status_pub_idx
  ON content_documents (type, status, published_at DESC);
CREATE INDEX IF NOT EXISTS content_documents_format_idx
  ON content_documents (format) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS content_documents_collection_idx
  ON content_documents (collection_id, sort_order);
