CREATE TABLE IF NOT EXISTS analytics_daily (
  day TEXT NOT NULL,
  event TEXT NOT NULL,
  path TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0 CHECK (count >= 0),
  PRIMARY KEY (day, event, path)
);

CREATE INDEX IF NOT EXISTS analytics_daily_day_idx
  ON analytics_daily (day DESC);