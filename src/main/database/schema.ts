export const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS email_template (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    subject_template TEXT NOT NULL,
    body_template TEXT NOT NULL,
    body_format TEXT NOT NULL DEFAULT 'text',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,

  `CREATE TABLE IF NOT EXISTS send_job (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    template_id INTEGER,
    source_filename TEXT NOT NULL,
    total_recipients INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'draft_creating',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    completed_at TEXT,
    FOREIGN KEY (template_id) REFERENCES email_template(id) ON DELETE SET NULL
  )`,

  `CREATE TABLE IF NOT EXISTS send_record (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id INTEGER NOT NULL,
    recipient_email TEXT NOT NULL,
    recipient_name TEXT NOT NULL,
    recipient_data TEXT NOT NULL DEFAULT '{}',
    rendered_subject TEXT NOT NULL,
    rendered_body TEXT NOT NULL,
    draft_message_id TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    error_message TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    sent_at TEXT,
    FOREIGN KEY (job_id) REFERENCES send_job(id) ON DELETE CASCADE
  )`,

  `CREATE TABLE IF NOT EXISTS attachment (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id INTEGER NOT NULL,
    filename TEXT NOT NULL,
    file_path TEXT NOT NULL,
    content_type TEXT NOT NULL DEFAULT 'application/octet-stream',
    file_size INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (job_id) REFERENCES send_job(id) ON DELETE CASCADE
  )`,

  `CREATE TABLE IF NOT EXISTS auth_state (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    token_cache TEXT,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,

  `CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )`
]
