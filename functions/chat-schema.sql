CREATE TABLE IF NOT EXISTS chat_conversations (
  id TEXT PRIMARY KEY NOT NULL,
  visitor_name TEXT NOT NULL CHECK (length(visitor_name) BETWEEN 1 AND 100),
  visitor_email TEXT NOT NULL CHECK (length(visitor_email) BETWEEN 3 AND 254),
  visitor_token_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS chat_conversations_status_updated
  ON chat_conversations (status, updated_at DESC);

CREATE TABLE IF NOT EXISTS chat_messages (
  id TEXT PRIMARY KEY NOT NULL,
  conversation_id TEXT NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  sender TEXT NOT NULL CHECK (sender IN ('visitor', 'staff')),
  body TEXT NOT NULL CHECK (length(body) BETWEEN 1 AND 4000),
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS chat_messages_conversation_created
  ON chat_messages (conversation_id, created_at, id);
