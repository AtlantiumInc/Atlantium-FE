-- Conversation rail: threads / participants / messages (plan §3.3, v2.1)
CREATE TYPE thread_kind AS ENUM ('comments', 'dm', 'group');

CREATE TYPE thread_subject_type AS ENUM ('document', 'directory_entry');

CREATE TABLE IF NOT EXISTS threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind thread_kind NOT NULL,
  subject_type thread_subject_type,
  subject_id uuid,
  title text,
  created_by text REFERENCES "user"(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- One comments thread per subject: the invariant is encoded, not implied.
CREATE UNIQUE INDEX IF NOT EXISTS threads_comments_subject_uq
  ON threads (subject_type, subject_id)
  WHERE kind = 'comments';

CREATE TABLE IF NOT EXISTS thread_participants (
  thread_id uuid NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member',
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (thread_id, user_id)
);

CREATE TABLE IF NOT EXISTS thread_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  author_user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  body text NOT NULL,
  parent_message_id uuid REFERENCES thread_messages(id) ON DELETE SET NULL,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS thread_messages_thread_time_idx
  ON thread_messages (thread_id, created_at);
