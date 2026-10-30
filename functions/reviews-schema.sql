CREATE TABLE IF NOT EXISTS reviews (
  comment_id INTEGER PRIMARY KEY AUTOINCREMENT,
  commentor_name TEXT NOT NULL CHECK (length(commentor_name) BETWEEN 1 AND 80),
  user_rating INTEGER NOT NULL CHECK (user_rating BETWEEN 1 AND 5),
  user_comment TEXT NOT NULL CHECK (length(user_comment) BETWEEN 1 AND 2000),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  admin_reply TEXT CHECK (admin_reply IS NULL OR length(admin_reply) BETWEEN 1 AND 1000),
  reply_at TEXT
);
