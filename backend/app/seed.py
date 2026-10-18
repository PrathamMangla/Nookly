from app.auth import hash_password, password_ok

USERS = [
    {
        "id": "priya",
        "name": "Priya Shah",
        "email": "priya.shah@riverside.care",
        "password": "riverside",
        "role": "support_worker",
        "role_label": "Support worker",
        "does": "Writes notes, reads the handover, logs incidents",
        "status": "On shift",
    },
    {
        "id": "hannah",
        "name": "Hannah Brooks",
        "email": "hannah.brooks@riverside.care",
        "password": "riverside",
        "role": "shift_lead",
        "role_label": "Shift lead",
        "does": "Reviews flags, assigns actions, publishes the handover",
        "status": "On shift",
    },
    {
        "id": "daniel",
        "name": "Daniel Adeyemi",
        "email": "daniel.adeyemi@riverside.care",
        "password": "riverside",
        "role": "manager",
        "role_label": "Manager",
        "does": "Oversight, incidents, trends, service setup",
        "status": "In today",
    },
    {
        "id": "alex",
        "name": "Alex Morgan",
        "email": "alex.morgan@riverside.care",
        "password": "riverside",
        "role": "system_admin",
        "role_label": "System admin",
        "does": "Users, roles, settings, and the audit trail",
        "status": "In today",
    },
]

SETTINGS = [
    {
        "id": "home",
        "label": "Home",
        "value": "Riverside",
        "hint": "The service this shift belongs to.",
        "group_name": "service",
    },
    {
        "id": "day-shift",
        "label": "Day shift",
        "value": "07:00–19:00",
        "hint": "When the day team is on.",
        "group_name": "service",
    },
    {
        "id": "night-shift",
        "label": "Night shift",
        "value": "19:00–07:00",
        "hint": "When the night team takes the handover.",
        "group_name": "service",
    },
    {
        "id": "falls-flag",
        "label": "Falls flag",
        "value": "A fall, a near miss, or unsteadiness in a note",
        "hint": "What raises a falls flag. It explains the note. It is not a score.",
        "group_name": "service",
    },
    {
        "id": "handover-rule",
        "label": "Handover",
        "value": "A shift lead reviews the OpenAI draft before it is published",
        "hint": "The draft is written from the notes. A person publishes it.",
        "group_name": "service",
    },
    {
        "id": "sign-in",
        "label": "Sign-in",
        "value": "Each person uses their own login",
        "hint": "Support worker, shift lead, manager, system admin.",
        "group_name": "system",
    },
    {
        "id": "audit-keep",
        "label": "Audit trail",
        "value": "Kept for this service",
        "hint": "Who did what, without the text of a care note.",
        "group_name": "system",
    },
    {
        "id": "care-lock",
        "label": "Care decisions",
        "value": "Not available to system admin",
        "hint": "This login cannot approve notes, edit care, or decide safeguarding.",
        "group_name": "system",
    },
]

DEMO_IDS = ["arthur", "helen", "nora", "james"]


def seed(conn) -> None:
    _ensure_users(conn)
    _sync_users(conn)
    _clear_demo(conn)
    _ensure_settings(conn)
    _ensure_shift(conn)


def _ensure_users(conn) -> None:
    count = conn.execute("SELECT COUNT(*) AS n FROM users").fetchone()["n"]
    if count:
        return
    users = [
        {
            "id": user["id"],
            "name": user["name"],
            "email": user["email"],
            "password_hash": hash_password(user["password"]),
            "role": user["role"],
            "role_label": user["role_label"],
            "does": user["does"],
            "status": user["status"],
            "position": index,
        }
        for index, user in enumerate(USERS)
    ]
    with conn.cursor() as cur:
        cur.executemany(
            """
            INSERT INTO users (id, name, email, password_hash, role, role_label, does, status, position)
            VALUES (
                %(id)s, %(name)s, %(email)s, %(password_hash)s, %(role)s,
                %(role_label)s, %(does)s, %(status)s, %(position)s
            )
            """,
            users,
        )


def _sync_users(conn) -> None:
    for user in USERS:
        row = conn.execute(
            "SELECT email, password_hash FROM users WHERE id = %s",
            (user["id"],),
        ).fetchone()
        if not row:
            continue
        stored = row["password_hash"] or ""
        if row["email"] != user["email"] or not password_ok(user["password"], stored):
            stored = hash_password(user["password"])
        conn.execute(
            """
            UPDATE users
            SET role = %s, role_label = %s, does = %s, email = %s, password_hash = %s
            WHERE id = %s
            """,
            (user["role"], user["role_label"], user["does"], user["email"], stored, user["id"]),
        )


def _clear_demo(conn) -> None:
    """Remove the sample morning once those sample people are still in the database."""
    found = conn.execute(
        "SELECT id FROM residents WHERE id = ANY(%s)",
        (DEMO_IDS,),
    ).fetchall()
    if found:
        conn.execute("DELETE FROM flags WHERE resident_id = ANY(%s)", (DEMO_IDS,))
        conn.execute("DELETE FROM incidents WHERE resident_id = ANY(%s)", (DEMO_IDS,))
        conn.execute("DELETE FROM actions WHERE resident_id = ANY(%s)", (DEMO_IDS,))
        conn.execute("DELETE FROM residents WHERE id = ANY(%s)", (DEMO_IDS,))
        conn.execute(
            """
            DELETE FROM audit_log
            WHERE subject LIKE 'Arthur Bennett%%'
               OR subject LIKE 'Helen Crowe%%'
               OR subject LIKE 'Nora Shah%%'
               OR subject LIKE 'James Okonkwo%%'
               OR id = ANY(%s)
            """,
            (["aud-1", "aud-2", "aud-3", "aud-4", "aud-5", "aud-6", "aud-7", "aud-8"],),
        )

    row = conn.execute("SELECT draft FROM shift WHERE id = 'today'").fetchone()
    if row and "Arthur Bennett, room 12" in (row["draft"] or ""):
        conn.execute(
            "UPDATE shift SET draft = '', published_text = '', published = FALSE WHERE id = 'today'"
        )


def _ensure_settings(conn) -> None:
    count = conn.execute("SELECT COUNT(*) AS n FROM settings").fetchone()["n"]
    if count:
        conn.execute(
            "UPDATE settings SET value = %s, hint = %s WHERE id = 'handover-rule'",
            (
                "A shift lead reviews the OpenAI draft before it is published",
                "The draft is written from the notes. A person publishes it.",
            ),
        )
        return
    rows = [{**item, "position": index} for index, item in enumerate(SETTINGS)]
    with conn.cursor() as cur:
        cur.executemany(
            """
            INSERT INTO settings (id, label, value, hint, group_name, position)
            VALUES (%(id)s, %(label)s, %(value)s, %(hint)s, %(group_name)s, %(position)s)
            """,
            rows,
        )


def _ensure_shift(conn) -> None:
    count = conn.execute("SELECT COUNT(*) AS n FROM shift").fetchone()["n"]
    if count:
        return
    conn.execute(
        """
        INSERT INTO shift (id, draft, published_text, published)
        VALUES ('today', '', '', FALSE)
        """
    )
