import json
import os
from contextlib import contextmanager
from pathlib import Path
from urllib.parse import urlparse, urlunparse

import psycopg
from dotenv import load_dotenv
from psycopg import sql
from psycopg.rows import dict_row

from app.seed import seed

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

DEFAULT_URL = "postgresql://postgres:postgres@127.0.0.1:5432/nookly"

USERS_TABLE = """
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    role_label TEXT NOT NULL,
    does TEXT NOT NULL,
    status TEXT NOT NULL,
    position INTEGER NOT NULL
)
"""

RESIDENTS_TABLE = """
CREATE TABLE IF NOT EXISTS residents (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    room TEXT NOT NULL,
    age INTEGER NOT NULL,
    jot TEXT NOT NULL,
    day_note TEXT NOT NULL,
    handover TEXT NOT NULL,
    watch TEXT,
    sent BOOLEAN NOT NULL DEFAULT FALSE,
    approved BOOLEAN NOT NULL DEFAULT FALSE,
    position INTEGER NOT NULL
)
"""

TAGS_COLUMN = "ALTER TABLE residents ADD COLUMN IF NOT EXISTS tags TEXT NOT NULL DEFAULT ''"

FLAGS_TABLE = """
CREATE TABLE IF NOT EXISTS flags (
    id TEXT PRIMARY KEY,
    resident_id TEXT NOT NULL,
    kind TEXT NOT NULL,
    title TEXT NOT NULL,
    why TEXT NOT NULL,
    status TEXT NOT NULL,
    position INTEGER NOT NULL
)
"""

INCIDENTS_TABLE = """
CREATE TABLE IF NOT EXISTS incidents (
    id TEXT PRIMARY KEY,
    resident_id TEXT NOT NULL,
    reported_by TEXT NOT NULL,
    kind TEXT NOT NULL,
    summary TEXT NOT NULL,
    status TEXT NOT NULL,
    when_label TEXT NOT NULL,
    position INTEGER NOT NULL
)
"""

ACTIONS_TABLE = """
CREATE TABLE IF NOT EXISTS actions (
    id TEXT PRIMARY KEY,
    resident_id TEXT NOT NULL,
    title TEXT NOT NULL,
    detail TEXT NOT NULL,
    assignee TEXT NOT NULL,
    status TEXT NOT NULL,
    position INTEGER NOT NULL
)
"""

AUDIT_TABLE = """
CREATE TABLE IF NOT EXISTS audit_log (
    id TEXT PRIMARY KEY,
    actor_name TEXT NOT NULL,
    action TEXT NOT NULL,
    subject TEXT NOT NULL,
    at_label TEXT NOT NULL,
    position INTEGER NOT NULL
)
"""

SETTINGS_TABLE = """
CREATE TABLE IF NOT EXISTS settings (
    id TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    value TEXT NOT NULL,
    hint TEXT NOT NULL,
    group_name TEXT NOT NULL,
    position INTEGER NOT NULL
)
"""

SHIFT_TABLE = """
CREATE TABLE IF NOT EXISTS shift (
    id TEXT PRIMARY KEY,
    draft TEXT NOT NULL,
    published_text TEXT NOT NULL,
    published BOOLEAN NOT NULL DEFAULT FALSE
)
"""


def database_url() -> str:
    return os.environ.get("DATABASE_URL", DEFAULT_URL)


def connect(url: str | None = None) -> psycopg.Connection:
    return psycopg.connect(url or database_url(), row_factory=dict_row)


@contextmanager
def session():
    conn = connect()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_db() -> None:
    ensure_database()
    with session() as conn:
        conn.execute(USERS_TABLE)
        conn.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT NOT NULL DEFAULT ''")
        conn.execute(
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT NOT NULL DEFAULT ''"
        )
        conn.execute(RESIDENTS_TABLE)
        conn.execute(TAGS_COLUMN)
        conn.execute("ALTER TABLE residents ADD COLUMN IF NOT EXISTS points TEXT NOT NULL DEFAULT ''")
        conn.execute(FLAGS_TABLE)
        conn.execute("ALTER TABLE flags ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'note'")
        conn.execute("ALTER TABLE flags ADD COLUMN IF NOT EXISTS source_quote TEXT NOT NULL DEFAULT ''")
        conn.execute(INCIDENTS_TABLE)
        conn.execute(ACTIONS_TABLE)
        conn.execute(
            "ALTER TABLE actions ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'manual'"
        )
        conn.execute("ALTER TABLE actions ADD COLUMN IF NOT EXISTS flag_id TEXT NOT NULL DEFAULT ''")
        conn.execute("ALTER TABLE actions ADD COLUMN IF NOT EXISTS incident_id TEXT NOT NULL DEFAULT ''")
        conn.execute(AUDIT_TABLE)
        conn.execute(SETTINGS_TABLE)
        conn.execute(SHIFT_TABLE)
        seed(conn)


def ensure_database() -> None:
    url = database_url()
    parsed = urlparse(url)
    name = parsed.path.lstrip("/")
    if not name:
        raise RuntimeError("DATABASE_URL needs a database name.")
    admin_url = urlunparse(parsed._replace(path="/postgres"))
    conn = psycopg.connect(admin_url, autocommit=True)
    try:
        exists = conn.execute(
            "SELECT 1 FROM pg_database WHERE datname = %s",
            (name,),
        ).fetchone()
        if exists is None:
            conn.execute(sql.SQL("CREATE DATABASE {}").format(sql.Identifier(name)))
    finally:
        conn.close()


def _points(value: str | None) -> list[str]:
    if not value:
        return []
    try:
        data = json.loads(value)
    except json.JSONDecodeError:
        return [line.strip() for line in value.splitlines() if line.strip()]
    if not isinstance(data, list):
        return []
    return [str(item).strip() for item in data if str(item).strip()]


def _tags(value: str | None) -> list[str]:
    if not value:
        return []
    return [part.strip() for part in value.split(",") if part.strip()]


def resident_dict(row: dict) -> dict:
    return {
        "id": row["id"],
        "name": row["name"],
        "room": row["room"],
        "age": row["age"],
        "jot": row["jot"],
        "day_note": row["day_note"],
        "handover": row["handover"],
        "watch": row["watch"],
        "tags": _tags(row.get("tags")),
        "points": _points(row.get("points")),
        "sent": bool(row["sent"]),
        "approved": bool(row["approved"]),
    }


def user_dict(row: dict) -> dict:
    return {
        "id": row["id"],
        "name": row["name"],
        "role": row["role"],
        "role_label": row["role_label"],
        "does": row["does"],
        "status": row["status"],
    }


def flag_dict(row: dict) -> dict:
    return {
        "id": row["id"],
        "resident_id": row["resident_id"],
        "resident_name": row["resident_name"],
        "room": row["room"],
        "kind": row["kind"],
        "title": row["title"],
        "why": row["why"],
        "source_quote": row.get("source_quote") or "",
        "status": row["status"],
    }


def incident_dict(row: dict) -> dict:
    return {
        "id": row["id"],
        "resident_id": row["resident_id"],
        "resident_name": row["resident_name"],
        "room": row["room"],
        "reported_by": row["reported_by"],
        "kind": row["kind"],
        "summary": row["summary"],
        "status": row["status"],
        "when_label": row["when_label"],
    }


def action_dict(row: dict) -> dict:
    return {
        "id": row["id"],
        "resident_id": row["resident_id"],
        "resident_name": row["resident_name"],
        "room": row["room"],
        "title": row["title"],
        "detail": row["detail"],
        "assignee": row["assignee"],
        "status": row["status"],
        "source": row.get("source") or "manual",
        "flag_id": row.get("flag_id") or "",
        "incident_id": row.get("incident_id") or "",
    }


def audit_dict(row: dict) -> dict:
    return {
        "id": row["id"],
        "actor_name": row["actor_name"],
        "action": row["action"],
        "subject": row["subject"],
        "at_label": row["at_label"],
    }


def setting_dict(row: dict) -> dict:
    return {
        "id": row["id"],
        "label": row["label"],
        "value": row["value"],
        "hint": row["hint"],
        "group_name": row["group_name"],
    }


def shift_dict(row: dict) -> dict:
    return {
        "draft": row["draft"],
        "published_text": row["published_text"],
        "published": bool(row["published"]),
    }

