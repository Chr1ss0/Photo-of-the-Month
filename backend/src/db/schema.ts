/**
 * Datenbankschema als Liste von Migrationen.
 * Neue Änderungen immer als neuen Eintrag anhängen – nie bestehende ändern.
 */
export const migrations: string[] = [
  `
  CREATE TABLE users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    username      TEXT    NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT    NOT NULL,
    role          TEXT    NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    disabled      INTEGER NOT NULL DEFAULT 0,
    created_at    TEXT    NOT NULL
  );

  CREATE TABLE sessions (
    token_hash   TEXT    PRIMARY KEY,
    user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at   TEXT    NOT NULL,
    expires_at   TEXT    NOT NULL
  );
  CREATE INDEX idx_sessions_user ON sessions(user_id);

  CREATE TABLE challenge_themes (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    kind        TEXT    NOT NULL CHECK (kind IN ('subject', 'twist')),
    title       TEXT    NOT NULL,
    description TEXT    NOT NULL DEFAULT '',
    active      INTEGER NOT NULL DEFAULT 1,
    created_at  TEXT    NOT NULL
  );

  CREATE TABLE challenges (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    period      TEXT    NOT NULL UNIQUE,          -- 'YYYY-MM'
    title       TEXT    NOT NULL,
    description TEXT    NOT NULL DEFAULT '',
    twist       TEXT,
    theme_id    INTEGER REFERENCES challenge_themes(id) ON DELETE SET NULL,
    twist_id    INTEGER REFERENCES challenge_themes(id) ON DELETE SET NULL,
    created_at  TEXT    NOT NULL
  );

  CREATE TABLE submissions (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    challenge_id   INTEGER NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
    user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    description    TEXT    NOT NULL DEFAULT '',
    show_location  INTEGER NOT NULL DEFAULT 1,
    image_file     TEXT    NOT NULL,
    thumb_file     TEXT    NOT NULL,
    width          INTEGER NOT NULL,
    height         INTEGER NOT NULL,
    -- EXIF
    aperture       REAL,
    exposure_time  REAL,
    iso            INTEGER,
    white_balance  TEXT,
    exposure_bias  REAL,
    gps_lat        REAL,
    gps_lon        REAL,
    focal_length   REAL,
    camera_make    TEXT,
    camera_model   TEXT,
    lens           TEXT,
    taken_at       TEXT,
    created_at     TEXT    NOT NULL,
    updated_at     TEXT    NOT NULL,
    UNIQUE (challenge_id, user_id)
  );
  CREATE INDEX idx_submissions_user ON submissions(user_id);

  CREATE TABLE comments (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    submission_id INTEGER NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
    user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    body          TEXT    NOT NULL,
    created_at    TEXT    NOT NULL
  );
  CREATE INDEX idx_comments_submission ON comments(submission_id);
  `,
];
