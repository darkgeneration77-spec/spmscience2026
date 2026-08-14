PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  class_name TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TEXT
);

CREATE TABLE IF NOT EXISTS attempts (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  set_id TEXT NOT NULL,
  set_label TEXT NOT NULL,
  paper TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'in_progress',
  current_question TEXT DEFAULT '',
  attempted_count INTEGER NOT NULL DEFAULT 0,
  total_questions INTEGER NOT NULL DEFAULT 0,
  score REAL DEFAULT 0,
  max_score REAL DEFAULT 0,
  percent REAL DEFAULT 0,
  started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TEXT,
  FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS answers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  attempt_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  set_id TEXT NOT NULL,
  paper TEXT DEFAULT '',
  question_id TEXT NOT NULL,
  chapter TEXT DEFAULT '',
  subtopic TEXT DEFAULT '',
  skill TEXT DEFAULT '',
  student_answer TEXT DEFAULT '',
  correct_answer TEXT DEFAULT '',
  is_correct INTEGER NOT NULL DEFAULT 0,
  marks_awarded REAL DEFAULT 0,
  marks_total REAL DEFAULT 0,
  explanation TEXT DEFAULT '',
  answered_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(attempt_id, question_id),
  FOREIGN KEY(attempt_id) REFERENCES attempts(id) ON DELETE CASCADE,
  FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_attempts_student ON attempts(student_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_answers_student ON answers(student_id, answered_at DESC);
CREATE INDEX IF NOT EXISTS idx_answers_topic ON answers(student_id, chapter, subtopic);
