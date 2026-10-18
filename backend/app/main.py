import json
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.db import (
    action_dict,
    audit_dict,
    flag_dict,
    incident_dict,
    init_db,
    resident_dict,
    session,
    setting_dict,
    shift_dict,
    user_dict,
)
from app.auth import password_ok
from app.draft import (
    DraftError,
    draft_resident_actions,
    draft_resident_handover,
    draft_shift_handover,
    write_care_note,
)
from app.schemas import (
    ActionIn,
    ActionOut,
    ActionUpdate,
    ApproveIn,
    AuditOut,
    DeskOut,
    DraftIn,
    DraftOut,
    FlagOut,
    FlagUpdate,
    HandoverIn,
    IncidentIn,
    IncidentOut,
    IncidentUpdate,
    LoginIn,
    PointsIn,
    ResidentIn,
    ResidentOut,
    TagsIn,
    SendIn,
    SettingOut,
    SettingUpdate,
    ShiftOut,
    ShiftUpdate,
    UserOut,
)

KIND_LABELS = {
    "fall": "fall",
    "near_miss": "near miss",
    "health": "health",
    "other": "other",
    "falls": "falls",
    "safeguarding": "safeguarding",
    "sleep": "sleep",
    "nutrition": "nutrition",
}


@asynccontextmanager
async def lifespan(_app: FastAPI):
    init_db()
    yield


app = FastAPI(
    title="Nookly",
    version="0.1.0",
    summary="Shift dashboards for the four Riverside roles.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5173", "http://localhost:5173", "https://nookly-p9ja.onrender.com"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {"name": "Nookly", "docs": "/docs"}


@app.get("/api/health")
def health():
    return {"ok": True}


@app.post("/api/login", response_model=UserOut)
def login(body: LoginIn):
    email = body.email.strip().lower()
    with session() as conn:
        row = conn.execute(
            "SELECT * FROM users WHERE lower(email) = %s",
            (email,),
        ).fetchone()
    if row is None or not password_ok(body.password, row.get("password_hash") or ""):
        raise HTTPException(status_code=401, detail="That email or password is not recognised.")
    return user_dict(row)


@app.get("/api/users", response_model=list[UserOut])
def list_users():
    with session() as conn:
        rows = conn.execute("SELECT * FROM users ORDER BY position").fetchall()
        return [user_dict(row) for row in rows]


@app.get("/api/residents", response_model=list[ResidentOut])
def list_residents():
    return _residents()


@app.get("/api/residents/{resident_id}", response_model=ResidentOut)
def get_resident(resident_id: str):
    return _resident_row(resident_id)


@app.get("/api/flags", response_model=list[FlagOut])
def list_flags():
    return _flags()


@app.get("/api/incidents", response_model=list[IncidentOut])
def list_incidents():
    return _incidents()


@app.get("/api/actions", response_model=list[ActionOut])
def list_actions():
    return _actions()


@app.get("/api/audit", response_model=list[AuditOut])
def list_audit():
    return _audit_rows()


@app.get("/api/settings", response_model=list[SettingOut])
def list_settings():
    return _settings()


@app.get("/api/shift", response_model=ShiftOut)
def get_shift():
    return _shift()


@app.get("/api/desk", response_model=DeskOut)
def get_desk():
    with session() as conn:
        return {
            "residents": [
                resident_dict(row)
                for row in conn.execute("SELECT * FROM residents ORDER BY position").fetchall()
            ],
            "users": [
                user_dict(row) for row in conn.execute("SELECT * FROM users ORDER BY position").fetchall()
            ],
            "flags": [flag_dict(row) for row in conn.execute(_joined("flags", "ASC")).fetchall()],
            "incidents": [incident_dict(row) for row in conn.execute(_joined("incidents")).fetchall()],
            "actions": [action_dict(row) for row in conn.execute(_joined("actions")).fetchall()],
            "audit": [
                audit_dict(row)
                for row in conn.execute("SELECT * FROM audit_log ORDER BY position DESC").fetchall()
            ],
            "settings": [
                setting_dict(row)
                for row in conn.execute("SELECT * FROM settings ORDER BY position").fetchall()
            ],
            "shift": shift_dict(_shift_row(conn)),
        }


@app.post("/api/residents", response_model=ResidentOut)
def create_resident(body: ResidentIn):
    resident_id = _resident_id(body.name)
    tags = ", ".join(part.strip() for part in body.tags.split(",") if part.strip())
    name = body.name.strip()
    with session() as conn:
        position = _next_position(conn, "residents")
        conn.execute(
            """
            INSERT INTO residents (
                id, name, room, age, jot, day_note, handover, watch, tags, sent, approved, position
            )
            VALUES (%s, %s, %s, %s, '', '', '', NULL, %s, FALSE, FALSE, %s)
            """,
            (resident_id, name, body.room.strip(), body.age, tags, position),
        )
        _record(conn, "Priya Shah", "Added a resident", name)
        row = conn.execute("SELECT * FROM residents WHERE id = %s", (resident_id,)).fetchone()
        return resident_dict(row)


@app.patch("/api/residents/{resident_id}/tags", response_model=ResidentOut)
def update_tags(resident_id: str, body: TagsIn):
    row = _resident_row(resident_id)
    tags = ", ".join(part.strip() for part in body.tags.split(",") if part.strip())
    with session() as conn:
        conn.execute("UPDATE residents SET tags = %s WHERE id = %s", (tags, resident_id))
        _record(conn, "Priya Shah", "Updated support marks", row["name"])
        updated = conn.execute("SELECT * FROM residents WHERE id = %s", (resident_id,)).fetchone()
        return resident_dict(updated)


@app.post("/api/residents/{resident_id}/draft", response_model=DraftOut)
def draft_note(resident_id: str, body: DraftIn):
    row = _resident_row(resident_id)
    try:
        points, flags, source = write_care_note(row["name"], row["room"], body.jot)
    except DraftError as exc:
        raise HTTPException(status_code=exc.status, detail=exc.detail) from exc
    written = body.jot.strip()
    with session() as conn:
        conn.execute(
            """
            UPDATE residents
            SET jot = %s, day_note = %s, points = %s, sent = FALSE, approved = FALSE
            WHERE id = %s
            """,
            (written, "\n".join(points), json.dumps(points), resident_id),
        )
        _replace_note_flags(conn, row["id"], row["name"], flags)
        _record(conn, "Priya Shah", "Found care points in a note", row["name"])
        updated = conn.execute("SELECT * FROM residents WHERE id = %s", (resident_id,)).fetchone()
        data = resident_dict(updated)
    return {
        "id": data["id"],
        "jot": data["jot"],
        "day_note": data["day_note"],
        "points": data["points"],
        "source": source,
        "sent": data["sent"],
        "approved": data["approved"],
    }


@app.put("/api/residents/{resident_id}/points", response_model=ResidentOut)
def edit_points(resident_id: str, body: PointsIn):
    row = _resident_row(resident_id)
    if not row["jot"].strip():
        raise HTTPException(status_code=400, detail="There is no written note to edit.")
    points = []
    for item in body.points:
        text = " ".join(item.split()).strip()
        if text:
            points.append(text[:400])
    if not points:
        raise HTTPException(status_code=400, detail="Add at least one care point.")
    with session() as conn:
        conn.execute(
            """
            UPDATE residents
            SET points = %s, day_note = %s, approved = FALSE
            WHERE id = %s
            """,
            (json.dumps(points), "\n".join(points), resident_id),
        )
        _record(conn, "Hannah Brooks", "Edited the care notes", row["name"])
        updated = conn.execute("SELECT * FROM residents WHERE id = %s", (resident_id,)).fetchone()
        return resident_dict(updated)


@app.post("/api/residents/{resident_id}/send", response_model=ResidentOut)
def send_note(resident_id: str, body: SendIn | None = None):
    row = _resident_row(resident_id)
    sent = True if body is None else body.sent
    if sent and not row["day_note"].strip():
        raise HTTPException(status_code=400, detail="There is no note to send.")
    approved = bool(row["approved"]) if sent else False
    with session() as conn:
        conn.execute(
            "UPDATE residents SET sent = %s, approved = %s WHERE id = %s",
            (sent, approved, resident_id),
        )
        _record(
            conn,
            "Priya Shah",
            "Sent a note for approval" if sent else "Took a note back",
            row["name"],
        )
        updated = conn.execute("SELECT * FROM residents WHERE id = %s", (resident_id,)).fetchone()
        return resident_dict(updated)


@app.post("/api/residents/{resident_id}/approve", response_model=ResidentOut)
def approve_note(resident_id: str, body: ApproveIn):
    row = _resident_row(resident_id)
    if body.approved and not row["sent"]:
        raise HTTPException(status_code=409, detail="The day note has not been sent yet.")
    with session() as conn:
        conn.execute(
            "UPDATE residents SET approved = %s WHERE id = %s",
            (body.approved, resident_id),
        )
        _record(
            conn,
            "Hannah Brooks",
            "Approved a note" if body.approved else "Cleared approval",
            row["name"],
        )
        updated = conn.execute("SELECT * FROM residents WHERE id = %s", (resident_id,)).fetchone()
        return resident_dict(updated)


@app.put("/api/residents/{resident_id}/handover", response_model=ResidentOut)
def write_handover(resident_id: str, body: HandoverIn):
    row = _resident_row(resident_id)
    with session() as conn:
        conn.execute(
            "UPDATE residents SET handover = %s WHERE id = %s",
            (body.handover.strip(), resident_id),
        )
        _record(conn, "Hannah Brooks", "Saved a handover line", row["name"])
        updated = conn.execute("SELECT * FROM residents WHERE id = %s", (resident_id,)).fetchone()
        return resident_dict(updated)


@app.post("/api/incidents", response_model=IncidentOut)
def log_incident(body: IncidentIn):
    resident = _resident_row(body.resident_id)
    incident_id = f"inc-{uuid.uuid4().hex[:8]}"
    with session() as conn:
        position = _next_position(conn, "incidents")
        conn.execute(
            """
            INSERT INTO incidents (
                id, resident_id, reported_by, kind, summary, status, when_label, position
            )
            VALUES (%s, %s, %s, %s, %s, 'open', 'Just now', %s)
            """,
            (incident_id, resident["id"], "Priya Shah", body.kind, body.summary.strip(), position),
        )
        _record(
            conn,
            "Priya Shah",
            "Logged an incident",
            f"{resident['name']} · {KIND_LABELS.get(body.kind, body.kind)}",
        )
        return _incident(conn, incident_id)


@app.patch("/api/incidents/{incident_id}", response_model=IncidentOut)
def track_incident(incident_id: str, body: IncidentUpdate):
    with session() as conn:
        current = _incident(conn, incident_id)
        conn.execute(
            "UPDATE incidents SET status = %s WHERE id = %s",
            (body.status, incident_id),
        )
        _record(
            conn,
            "Daniel Adeyemi",
            "Updated an incident",
            f"{current['resident_name']} · {body.status}",
        )
        return _incident(conn, incident_id)


@app.patch("/api/flags/{flag_id}", response_model=FlagOut)
def review_flag(flag_id: str, body: FlagUpdate):
    with session() as conn:
        current = _flag(conn, flag_id)
        conn.execute("UPDATE flags SET status = %s WHERE id = %s", (body.status, flag_id))
        _record(
            conn,
            "Hannah Brooks",
            "Reviewed a flag" if body.status == "reviewed" else "Reopened a flag",
            f"{current['resident_name']} · {KIND_LABELS.get(current['kind'], current['kind'])}",
        )
        return _flag(conn, flag_id)


@app.post("/api/actions", response_model=ActionOut)
def assign_action(body: ActionIn):
    resident = _resident_row(body.resident_id)
    action_id = f"act-{uuid.uuid4().hex[:8]}"
    with session() as conn:
        position = _next_position(conn, "actions")
        conn.execute(
            """
            INSERT INTO actions (
                id, resident_id, title, detail, assignee, status, source, flag_id, incident_id, position
            )
            VALUES (%s, %s, %s, %s, %s, 'open', 'manual', %s, %s, %s)
            """,
            (
                action_id,
                resident["id"],
                body.title.strip(),
                body.detail.strip(),
                body.assignee.strip(),
                body.flag_id.strip(),
                body.incident_id.strip(),
                position,
            ),
        )
        _record(
            conn,
            "Hannah Brooks",
            "Assigned an action",
            f"{resident['name']} · {body.title.strip()}",
        )
        return _action(conn, action_id)


@app.post("/api/residents/{resident_id}/actions/draft", response_model=list[ActionOut])
def draft_actions(resident_id: str):
    resident = _resident_row(resident_id)
    flags = [flag for flag in _flags() if flag["resident_id"] == resident_id]
    incidents = [item for item in _incidents() if item["resident_id"] == resident_id]
    try:
        drafted = draft_resident_actions(resident, flags, incidents)
    except DraftError as exc:
        raise HTTPException(status_code=exc.status, detail=exc.detail) from exc
    created = []
    with session() as conn:
        conn.execute(
            """
            DELETE FROM actions
            WHERE resident_id = %s AND source = 'openai' AND status = 'open'
            """,
            (resident_id,),
        )
        for item in drafted:
            action_id = f"act-{uuid.uuid4().hex[:8]}"
            position = _next_position(conn, "actions")
            conn.execute(
                """
                INSERT INTO actions (
                    id, resident_id, title, detail, assignee, status, source, flag_id, incident_id, position
                )
                VALUES (%s, %s, %s, %s, %s, 'open', 'openai', %s, %s, %s)
                """,
                (
                    action_id,
                    resident["id"],
                    item["title"],
                    item["detail"],
                    item["assignee"],
                    item["flag_id"],
                    item["incident_id"],
                    position,
                ),
            )
            _record(conn, "Hannah Brooks", "Drafted an action", f"{resident['name']} · {item['title']}")
            created.append(_action(conn, action_id))
    return created


@app.post("/api/residents/{resident_id}/handover/draft", response_model=ResidentOut)
def draft_handover(resident_id: str):
    resident = _resident_row(resident_id)
    flags = [flag for flag in _flags() if flag["resident_id"] == resident_id]
    incidents = [item for item in _incidents() if item["resident_id"] == resident_id]
    try:
        text = draft_resident_handover(resident, flags, incidents)
    except DraftError as exc:
        raise HTTPException(status_code=exc.status, detail=exc.detail) from exc
    with session() as conn:
        conn.execute(
            "UPDATE residents SET handover = %s WHERE id = %s",
            (text, resident_id),
        )
        _record(conn, "Hannah Brooks", "Drafted a handover", resident["name"])
        updated = conn.execute("SELECT * FROM residents WHERE id = %s", (resident_id,)).fetchone()
        return resident_dict(updated)


@app.patch("/api/actions/{action_id}", response_model=ActionOut)
def update_action(action_id: str, body: ActionUpdate):
    with session() as conn:
        current = _action(conn, action_id)
        conn.execute(
            "UPDATE actions SET status = %s WHERE id = %s",
            (body.status, action_id),
        )
        _record(
            conn,
            "Hannah Brooks",
            "Completed an action" if body.status == "done" else "Reopened an action",
            f"{current['resident_name']} · {current['title']}",
        )
        return _action(conn, action_id)


@app.put("/api/shift", response_model=ShiftOut)
def save_shift(body: ShiftUpdate):
    with session() as conn:
        _shift_row(conn)
        conn.execute("UPDATE shift SET draft = %s WHERE id = 'today'", (body.draft.strip(),))
        _record(conn, "Hannah Brooks", "Saved the handover draft", "Tonight’s handover")
        return shift_dict(_shift_row(conn))


@app.post("/api/shift/draft", response_model=ShiftOut)
def redraft_shift():
    residents = _residents()
    flags = _flags()
    home = next((item["value"] for item in _settings() if item["id"] == "home"), "Riverside")
    try:
        text = draft_shift_handover(residents, flags, home)
    except DraftError as exc:
        raise HTTPException(status_code=exc.status, detail=exc.detail) from exc
    with session() as conn:
        _shift_row(conn)
        conn.execute("UPDATE shift SET draft = %s WHERE id = 'today'", (text,))
        _record(conn, "Hannah Brooks", "Drafted the handover again", "Tonight’s handover")
        return shift_dict(_shift_row(conn))


@app.post("/api/shift/publish", response_model=ShiftOut)
def publish_shift():
    with session() as conn:
        row = _shift_row(conn)
        draft = row["draft"].strip()
        if not draft:
            raise HTTPException(status_code=400, detail="There is no handover to publish.")
        conn.execute(
            "UPDATE shift SET draft = %s, published_text = %s, published = TRUE WHERE id = 'today'",
            (draft, draft),
        )
        _record(conn, "Hannah Brooks", "Published the handover", "Tonight’s handover")
        return shift_dict(_shift_row(conn))


@app.patch("/api/settings/{group}/{setting_id}", response_model=SettingOut)
def update_setting(group: str, setting_id: str, body: SettingUpdate):
    if group not in {"service", "system"}:
        raise HTTPException(status_code=404, detail="Setting not found.")
    if setting_id == "care-lock":
        raise HTTPException(status_code=403, detail="Care decisions stay off this login.")
    actor = "Daniel Adeyemi" if group == "service" else "Alex Morgan"
    with session() as conn:
        row = conn.execute("SELECT * FROM settings WHERE id = %s", (setting_id,)).fetchone()
        if row is None or row["group_name"] != group:
            raise HTTPException(status_code=404, detail="Setting not found.")
        conn.execute(
            "UPDATE settings SET value = %s WHERE id = %s",
            (body.value.strip(), setting_id),
        )
        _record(conn, actor, "Updated a setting", row["label"])
        updated = conn.execute("SELECT * FROM settings WHERE id = %s", (setting_id,)).fetchone()
        return setting_dict(updated)


def _residents() -> list[dict]:
    with session() as conn:
        rows = conn.execute("SELECT * FROM residents ORDER BY position").fetchall()
        return [resident_dict(row) for row in rows]


def _resident_row(resident_id: str) -> dict:
    with session() as conn:
        row = conn.execute("SELECT * FROM residents WHERE id = %s", (resident_id,)).fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail="Resident not found.")
        return resident_dict(row)


def _flags() -> list[dict]:
    with session() as conn:
        rows = conn.execute(_joined("flags", "ASC")).fetchall()
        return [flag_dict(row) for row in rows]


def _incidents() -> list[dict]:
    with session() as conn:
        rows = conn.execute(_joined("incidents")).fetchall()
        return [incident_dict(row) for row in rows]


def _actions() -> list[dict]:
    with session() as conn:
        rows = conn.execute(_joined("actions")).fetchall()
        return [action_dict(row) for row in rows]


def _audit_rows() -> list[dict]:
    with session() as conn:
        rows = conn.execute("SELECT * FROM audit_log ORDER BY position DESC").fetchall()
        return [audit_dict(row) for row in rows]


def _settings() -> list[dict]:
    with session() as conn:
        rows = conn.execute("SELECT * FROM settings ORDER BY position").fetchall()
        return [setting_dict(row) for row in rows]


def _shift() -> dict:
    with session() as conn:
        return shift_dict(_shift_row(conn))


def _joined(table: str, order: str = "DESC") -> str:
    direction = "ASC" if order == "ASC" else "DESC"
    return f"""
        SELECT t.*, r.name AS resident_name, r.room
        FROM {table} t
        JOIN residents r ON r.id = t.resident_id
        ORDER BY t.position {direction}
    """


def _shift_row(conn):
    row = conn.execute("SELECT * FROM shift WHERE id = 'today'").fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="The shift handover is not ready.")
    return row


def _flag(conn, flag_id: str) -> dict:
    row = conn.execute(
        """
        SELECT t.*, r.name AS resident_name, r.room
        FROM flags t
        JOIN residents r ON r.id = t.resident_id
        WHERE t.id = %s
        """,
        (flag_id,),
    ).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="Flag not found.")
    return flag_dict(row)


def _incident(conn, incident_id: str) -> dict:
    row = conn.execute(
        """
        SELECT t.*, r.name AS resident_name, r.room
        FROM incidents t
        JOIN residents r ON r.id = t.resident_id
        WHERE t.id = %s
        """,
        (incident_id,),
    ).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="Incident not found.")
    return incident_dict(row)


def _action(conn, action_id: str) -> dict:
    row = conn.execute(
        """
        SELECT t.*, r.name AS resident_name, r.room
        FROM actions t
        JOIN residents r ON r.id = t.resident_id
        WHERE t.id = %s
        """,
        (action_id,),
    ).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="Action not found.")
    return action_dict(row)


def _resident_id(name: str) -> str:
    base = "".join(char for char in name.lower() if char.isalnum())[:24] or "resident"
    return f"{base}-{uuid.uuid4().hex[:4]}"


def _replace_note_flags(conn, resident_id: str, name: str, flags: list[dict]) -> None:
    conn.execute(
        """
        DELETE FROM flags
        WHERE resident_id = %s AND source = 'note' AND status = 'open'
        """,
        (resident_id,),
    )
    for flag in flags:
        position = _next_position(conn, "flags")
        conn.execute(
            """
            INSERT INTO flags (id, resident_id, kind, title, why, status, source, source_quote, position)
            VALUES (%s, %s, %s, %s, %s, 'open', 'note', %s, %s)
            """,
            (
                f"flag-{uuid.uuid4().hex[:8]}",
                resident_id,
                flag["kind"],
                flag["title"],
                flag["why"],
                flag.get("source", ""),
                position,
            ),
        )
        _record(conn, "Nookly", "Raised a flag from the note", f"{name} · {flag['kind']}")


def _next_position(conn, table: str) -> int:
    row = conn.execute(f"SELECT COALESCE(MAX(position), -1) AS n FROM {table}").fetchone()
    return row["n"] + 1


def _record(conn, actor_name: str, action: str, subject: str) -> None:
    position = _next_position(conn, "audit_log")
    conn.execute(
        """
        INSERT INTO audit_log (id, actor_name, action, subject, at_label, position)
        VALUES (%s, %s, %s, %s, 'Just now', %s)
        """,
        (f"aud-{uuid.uuid4().hex[:8]}", actor_name, action, subject, position),
    )
