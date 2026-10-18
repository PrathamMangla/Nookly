import json
import os

from openai import APIConnectionError, APIStatusError, OpenAI, RateLimitError

FLAG_KINDS = {"falls", "health", "safeguarding", "sleep", "nutrition"}

NOTE_INSTRUCTIONS = """You read a support worker's own note and pull out the care points, plus explainable concern flags only when the note supports them.

Rules:
- Use only facts that are in the note. Do not invent people, times, injuries, or events.
- points are the care notes. Each point is one short factual line found in the writing, in the order it appears. Do not polish it into a different story.
- Do not diagnose.
- Do not advise or change medication. If the note says something was given, record only that fact.
- Do not make a safeguarding decision. If the note describes a concern, record what was seen or said.
- A flag is allowed only when the note itself supports it.
- title is a short factual heading.
- why restates the fact from the note in plain words. Do not say risk, score, predict, likely, or indicate. End by saying it is not a diagnosis or a decision.
- source is an exact short quote copied from the note, word for word, that supports the flag.
- If nothing in the note needs a flag, return an empty flags list.
"""

HANDOVER_INSTRUCTIONS = """You write the shift handover for the next team in a residential home.

Rules:
- Use only the notes, saved handover lines, and open flags provided. Do not invent facts.
- Say what the next shift needs to do, in plain prose, one short block per resident.
- Do not diagnose, advise medication, or decide safeguarding.
- Open flags are for a person to review. Say that they are not decisions.
- If a resident has no care note, say that nothing has been written yet.
"""

PERSON_HANDOVER_INSTRUCTIONS = """You write the handover for one resident, for the next team in a residential home.

Rules:
- Write only from the flags and incidents listed. Do not invent facts.
- The care note is background. Do not add an event that is not in a flag or an incident.
- Write one short paragraph in plain words.
- Say what the next shift needs to know and do for each flag and incident.
- Do not diagnose, advise or change medication, or make a safeguarding decision.
- A flag is for a person to review. Say that it is not a decision.
"""

ACTION_INSTRUCTIONS = """You write communication-book actions for one resident, for the next shift in a residential home.

Rules:
- Write one action for every flag and every incident listed. Copy originKind and originId exactly.
- Use only that flag or incident. Do not invent facts, times, injuries, or events.
- Do not diagnose, advise or change medication, or make a safeguarding decision.
- For a flag, the action asks someone to review what was seen. Say that it is not a decision.
- For an incident, the action is the practical follow-up already described.
- Do not name a room or assign the action to a person.
- title is a short instruction. detail is one plain sentence from that flag or incident.
"""

ACTION_FORMAT = {
    "type": "json_schema",
    "json_schema": {
        "name": "shift_actions",
        "strict": True,
        "schema": {
            "type": "object",
            "additionalProperties": False,
            "properties": {
                "actions": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "additionalProperties": False,
                        "properties": {
                            "originKind": {"type": "string", "enum": ["flag", "incident"]},
                            "originId": {"type": "string"},
                            "title": {"type": "string"},
                            "detail": {"type": "string"},
                        },
                        "required": ["originKind", "originId", "title", "detail"],
                    },
                }
            },
            "required": ["actions"],
        },
    },
}

NOTE_FORMAT = {
    "type": "json_schema",
    "json_schema": {
        "name": "care_note",
        "strict": True,
        "schema": {
            "type": "object",
            "additionalProperties": False,
            "properties": {
                "points": {"type": "array", "items": {"type": "string"}},
                "flags": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "additionalProperties": False,
                        "properties": {
                            "kind": {
                                "type": "string",
                                "enum": ["falls", "health", "safeguarding", "sleep", "nutrition"],
                            },
                            "title": {"type": "string"},
                            "why": {"type": "string"},
                            "source": {"type": "string"},
                        },
                        "required": ["kind", "title", "why", "source"],
                    },
                },
            },
            "required": ["points", "flags"],
        },
    },
}


class DraftError(Exception):
    def __init__(self, detail: str, status: int = 502):
        super().__init__(detail)
        self.detail = detail
        self.status = status


def write_care_note(name: str, room: str, jot: str) -> tuple[list[str], list[dict], str]:
    """Return care points found in the note, explainable flags, and the source label."""
    written = jot.strip()
    raw = _complete(
        NOTE_INSTRUCTIONS,
        f"Person: {name}\nNote:\n{written}",
        NOTE_FORMAT,
    )
    try:
        data = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise DraftError("OpenAI did not return care points.") from exc

    points = []
    for item in data.get("points") or []:
        point = " ".join(str(item).split()).strip()
        if not point:
            continue
        points.append(point[:240])
        if len(points) == 8:
            break
    if not points:
        raise DraftError("OpenAI did not find any care points in that note.")

    flags = []
    for item in data.get("flags") or []:
        kind = str(item.get("kind", "")).strip()
        title = " ".join(str(item.get("title", "")).split()).strip()
        why = " ".join(str(item.get("why", "")).split()).strip()
        quote = _quote(written, str(item.get("source", "")))
        if kind not in FLAG_KINDS or not title or not why or not quote:
            continue
        flags.append({"kind": kind, "title": title[:180], "why": why[:800], "source": quote})
        if len(flags) == 6:
            break
    return points, flags, "openai"


def _quote(written: str, source: str) -> str:
    """Keep a flag only when its source is a real span of the carer's note."""
    source = " ".join(source.split()).strip()
    if not source:
        return ""
    if source in written:
        return source[:240]
    found = written.lower().find(source.lower())
    if found < 0:
        return ""
    return written[found : found + len(source)][:240]


def draft_shift_handover(residents: list[dict], flags: list[dict], home: str = "Riverside") -> str:
    """Ask OpenAI for a handover from the notes and open flags already saved."""
    if not any((person.get("day_note") or "").strip() for person in residents):
        raise DraftError("Write a care note before drafting the handover.", status=400)

    lines = [f"Home: {home}", ""]
    for person in residents:
        note = (person.get("day_note") or "").strip() or "Nothing written yet."
        saved = (person.get("handover") or "").strip()
        line = f"{person['name']}. Care note: {note}"
        if saved:
            line += f" Saved handover: {saved}"
        lines.append(line)
    open_flags = [flag for flag in flags if flag.get("status") == "open"]
    lines.append("")
    if open_flags:
        lines.append("Open flags:")
        for flag in open_flags:
            lines.append(
                f"- {flag.get('kind', 'flag')}, {flag.get('resident_name', 'Resident')}: "
                f"{flag.get('title', '')}. {flag.get('why', '')}"
            )
    else:
        lines.append("Open flags: none.")

    text = _complete(HANDOVER_INSTRUCTIONS, "\n".join(lines)).strip()
    if not text:
        raise DraftError("OpenAI returned an empty handover.")
    return text[:8000]


def draft_resident_handover(resident: dict, flags: list[dict], incidents: list[dict]) -> str:
    """Ask OpenAI for one resident's handover from their flags and incidents."""
    if not _care_sources(flags, incidents):
        raise DraftError("A flag or an incident is needed before drafting the handover.", status=400)
    text = _complete(PERSON_HANDOVER_INSTRUCTIONS, _resident_brief(resident, flags, incidents)).strip()
    if not text:
        raise DraftError("OpenAI returned an empty handover.")
    return text[:4000]


def draft_resident_actions(resident: dict, flags: list[dict], incidents: list[dict]) -> list[dict]:
    """Ask OpenAI for one action per flag and incident."""
    sources = _care_sources(flags, incidents)
    if not sources:
        raise DraftError("A flag or an incident is needed before drafting actions.", status=400)
    raw = _complete(ACTION_INSTRUCTIONS, _resident_brief(resident, flags, incidents), ACTION_FORMAT)
    try:
        data = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise DraftError("OpenAI did not return actions.") from exc

    allowed = {item["id"]: item["kind"] for item in sources}
    seen = set()
    drafted = []
    for item in data.get("actions") or []:
        origin_id = str(item.get("originId", "")).strip()
        origin_kind = str(item.get("originKind", "")).strip()
        title = " ".join(str(item.get("title", "")).split()).strip()
        detail = " ".join(str(item.get("detail", "")).split()).strip()
        if origin_id in seen or allowed.get(origin_id) != origin_kind:
            continue
        if not title:
            continue
        seen.add(origin_id)
        drafted.append(
            {
                "title": title[:180],
                "assignee": "",
                "detail": detail[:500],
                "flag_id": origin_id if origin_kind == "flag" else "",
                "incident_id": origin_id if origin_kind == "incident" else "",
            }
        )
        if len(drafted) == 8:
            break
    if not drafted:
        raise DraftError("OpenAI did not find an action for those flags or incidents.", status=400)
    return drafted


def _care_sources(flags: list[dict], incidents: list[dict]) -> list[dict]:
    sources = []
    for flag in flags:
        sources.append(
            {
                "kind": "flag",
                "id": flag["id"],
                "label": flag.get("kind", "flag"),
                "text": f"{flag.get('title', '')}. {flag.get('why', '')}".strip(),
            }
        )
    for incident in incidents:
        if incident.get("status") == "closed":
            continue
        sources.append(
            {
                "kind": "incident",
                "id": incident["id"],
                "label": incident.get("kind", "incident"),
                "text": incident.get("summary", ""),
            }
        )
    return sources


def _resident_brief(resident: dict, flags: list[dict], incidents: list[dict] | None = None) -> str:
    note = (resident.get("day_note") or "").strip() or "Nothing written yet."
    lines = [
        f"{resident['name']}.",
        f"Care note: {note}",
        "Create from these flags and incidents only:",
    ]
    sources = _care_sources(flags, incidents or [])
    if not sources:
        lines.append("None.")
        return "\n".join(lines)
    for source in sources:
        lines.append(f"- {source['kind']} {source['id']} ({source['label']}): {source['text']}")
    return "\n".join(lines)


def _complete(instructions: str, user: str, response_format: dict | None = None) -> str:
    key = os.environ.get("OPENAI_API_KEY", "").strip()
    if not key:
        raise DraftError(
            "Add OPENAI_API_KEY to the backend environment, then try again.",
            status=503,
        )
    client = OpenAI(api_key=key, timeout=45)
    model = os.environ.get("OPENAI_MODEL", "gpt-4o-mini").strip() or "gpt-4o-mini"
    kwargs = {
        "model": model,
        "messages": [
            {"role": "system", "content": instructions},
            {"role": "user", "content": user},
        ],
        "temperature": 0.2,
    }
    if response_format:
        kwargs["response_format"] = response_format
    try:
        response = client.chat.completions.create(**kwargs)
    except RateLimitError as exc:
        raise DraftError("OpenAI is busy. Wait a moment and try again.", status=429) from exc
    except APIConnectionError as exc:
        raise DraftError("OpenAI could not be reached.", status=502) from exc
    except APIStatusError as exc:
        raise DraftError("OpenAI could not write that.", status=502) from exc
    content = response.choices[0].message.content or ""
    return content.strip()
