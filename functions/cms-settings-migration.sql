CREATE TABLE cms_items_with_settings (
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

INSERT INTO cms_items_with_settings
  (id, content_type, slug, title, payload_json, status, created_at, updated_at, updated_by)
SELECT id, content_type, slug, title, payload_json, status, created_at, updated_at, updated_by
FROM cms_items;

DROP TABLE cms_items;
ALTER TABLE cms_items_with_settings RENAME TO cms_items;

CREATE INDEX IF NOT EXISTS cms_items_publication_idx
  ON cms_items (content_type, status, updated_at DESC);
