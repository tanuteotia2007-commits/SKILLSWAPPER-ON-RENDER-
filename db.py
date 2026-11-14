"""Database layer.

* Local development: SQLite file (DB_PATH), zero setup.
* Production: PostgreSQL when DATABASE_URL is set (Render Postgres, Neon, Supabase, ...).
  This is what makes accounts and data survive restarts and redeploys on hosts with an
  ephemeral filesystem.

Application code writes plain SQL with `?` placeholders and portable constructs
(ON CONFLICT upserts); the Postgres wrapper below translates the placeholders.
No demo/seed data is created: every row in the database comes from a real user.
"""
import os, json, sqlite3

DATABASE_URL = os.environ.get("DATABASE_URL", "").strip()
PG = DATABASE_URL.startswith(("postgres://", "postgresql://"))
DB = os.environ.get("DB_PATH", os.path.join(os.path.dirname(os.path.abspath(__file__)), "skillswapper.db"))

_PK = "SERIAL PRIMARY KEY" if PG else "INTEGER PRIMARY KEY AUTOINCREMENT"
_TS = "TIMESTAMP" if PG else "DATETIME"
_NOW = "(NOW() AT TIME ZONE 'UTC')" if PG else "CURRENT_TIMESTAMP"  # always UTC

SCHEMA = [
    f"""CREATE TABLE IF NOT EXISTS users(id {_PK}, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL, pw TEXT NOT NULL,
        token TEXT, level INTEGER DEFAULT 2, slots TEXT DEFAULT '[]', demo INTEGER DEFAULT 0)""",
    f"""CREATE TABLE IF NOT EXISTS skills(id {_PK}, user_id INTEGER NOT NULL REFERENCES users(id),
        name TEXT NOT NULL, kind TEXT NOT NULL CHECK(kind IN ('teach','learn')))""",
    """CREATE TABLE IF NOT EXISTS verifications(user_id INTEGER, skill TEXT, score INTEGER, evidence TEXT,
        PRIMARY KEY(user_id, skill))""",
    f"""CREATE TABLE IF NOT EXISTS messages(id {_PK}, sender INTEGER, receiver INTEGER, text TEXT,
        ts {_TS} DEFAULT {_NOW})""",
    "CREATE TABLE IF NOT EXISTS growth(user_id INTEGER, skill TEXT, pre INTEGER, post INTEGER, PRIMARY KEY(user_id, skill))",
    "CREATE INDEX IF NOT EXISTS idx_users_token ON users(token)",
    "CREATE INDEX IF NOT EXISTS idx_skills_user ON skills(user_id)",
    "CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender)",
    "CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver)",
]


class _PGConn:
    """Gives a psycopg connection the same tiny interface the app uses with sqlite3."""

    def __init__(self, raw):
        self.raw = raw

    def execute(self, sql, params=()):
        return self.raw.execute(sql.replace("?", "%s"), tuple(params))

    def commit(self):
        self.raw.commit()

    def close(self):
        self.raw.close()


def conn():
    if PG:
        try:
            import psycopg
            from psycopg.rows import dict_row
        except ImportError as e:  # pragma: no cover
            raise RuntimeError("DATABASE_URL is set but psycopg is missing: pip install 'psycopg[binary]'") from e
        return _PGConn(psycopg.connect(DATABASE_URL, row_factory=dict_row, connect_timeout=15))
    c = sqlite3.connect(DB)
    c.row_factory = sqlite3.Row
    c.execute("PRAGMA foreign_keys=ON")
    return c


def purge_demo(c):
    """Remove demo accounts created by earlier versions of this project (flagged demo=1) and everything tied to them."""
    ids = "SELECT id FROM users WHERE demo=1"
    c.execute(f"DELETE FROM messages WHERE sender IN ({ids}) OR receiver IN ({ids})")
    for t in ("skills", "verifications", "growth"):
        c.execute(f"DELETE FROM {t} WHERE user_id IN ({ids})")
    c.execute("DELETE FROM users WHERE demo=1")


def init():
    c = conn()
    try:
        if PG:  # serialise start-up when several workers boot at once
            c.execute("SELECT pg_advisory_lock(727001)")
        for stmt in SCHEMA:
            c.execute(stmt)
        purge_demo(c)
        c.commit()
    finally:
        c.close()  # also releases the advisory lock


def ts(v):
    """Timestamps as 'YYYY-MM-DD HH:MM:SS' (UTC) on both databases."""
    return v.strftime("%Y-%m-%d %H:%M:%S") if hasattr(v, "strftime") else str(v)


def _build(u, skills, vers):
    return {"id": u["id"], "name": u["name"], "level": u["level"], "slots": json.loads(u["slots"] or "[]"),
            "teach": [s["name"] for s in skills if s["kind"] == "teach"],
            "learn": [s["name"] for s in skills if s["kind"] == "learn"],
            "verified": {v["skill"]: v["score"] for v in vers},
            "trust": max([v["score"] for v in vers] or [0])}


def full(c, uid):
    u = c.execute("SELECT * FROM users WHERE id=?", (uid,)).fetchone()
    if not u:
        return None
    sk = c.execute("SELECT name,kind FROM skills WHERE user_id=? ORDER BY id", (uid,)).fetchall()
    ver = c.execute("SELECT skill,score FROM verifications WHERE user_id=?", (uid,)).fetchall()
    return _build(u, sk, ver)


def everyone(c):
    """All profiles in 3 queries (instead of 3 per user). Returns {user_id: profile}."""
    users = c.execute("SELECT * FROM users ORDER BY id").fetchall()
    by_sk, by_v = {}, {}
    for s in c.execute("SELECT user_id,name,kind FROM skills ORDER BY id").fetchall():
        by_sk.setdefault(s["user_id"], []).append(s)
    for v in c.execute("SELECT user_id,skill,score FROM verifications").fetchall():
        by_v.setdefault(v["user_id"], []).append(v)
    return {u["id"]: _build(u, by_sk.get(u["id"], []), by_v.get(u["id"], [])) for u in users}
