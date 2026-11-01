CREATE TABLE IF NOT EXISTS cms_items (
  id TEXT PRIMARY KEY,
  content_type TEXT NOT NULL CHECK (content_type IN ('property', 'team', 'partner', 'promotion', 'service', 'settings', 'resource', 'page')),
  slug TEXT NOT NULL,
  title TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 160),
  payload_json TEXT NOT NULL CHECK (json_valid(payload_json)),
  status TEXT NOT NULL CHECK (status IN ('draft', 'published', 'archived')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by TEXT NOT NULL,
  UNIQUE (content_type, slug)
);

CREATE INDEX IF NOT EXISTS cms_items_publication_idx
  ON cms_items (content_type, status, updated_at DESC);

CREATE TABLE IF NOT EXISTS cms_audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id TEXT NOT NULL,
  content_type TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('create', 'update', 'publish', 'unpublish', 'archive')),
  actor_email TEXT NOT NULL,
  changed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cms_revisions (
  revision_id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id TEXT NOT NULL,
  content_type TEXT NOT NULL,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  payload_json TEXT NOT NULL CHECK (json_valid(payload_json)),
  status TEXT NOT NULL CHECK (status IN ('draft', 'published', 'archived')),
  action TEXT NOT NULL CHECK (action IN ('create', 'update', 'publish', 'unpublish', 'archive', 'restore')),
  actor_email TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS cms_revisions_item_idx
  ON cms_revisions (item_id, revision_id DESC);
