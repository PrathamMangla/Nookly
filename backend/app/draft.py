import json
import os
import re

from openai import APIConnectionError, APIStatusError, OpenAI, RateLimitError

FLAG_KINDS = {"falls", "health", "safeguarding", "sleep", "nutrition"}

NOTE_INSTRUCTIONS = """You read a support worker's own note and pull out the care notes.

Rules:
- Use only facts that are in the note. Do not invent people, times, injuries, or events.
- points are the care notes. Each point is one short factual line found in the writing, in the order it appears. Do not polish it into a different story.
- Split separate facts into separate points. Do not join fatigue, sleep, eating, and a fall into one point.
- Do not diagnose.
- Do not advise or change medication. If the note says something was given, record only that fact.
- Do not make a safeguarding decision. If the note describes a concern, record what was seen or said.
"""

FLAG_INSTRUCTIONS = """You find each concern in a support worker's note and in the care notes taken from it.

A flag is one concern. Read the note, then read every care note, and raise a separate flag for each concern. Do not join two concerns into one flag.

Concerns:
- falls: a fall, a near fall, or being unsteady
- health: pain, fatigue, illness, or a change in how the person feels or manages the day
- sleep: poor sleep, waking at night, or being drowsy through the day
- nutrition: not eating, not drinking, leaving food, or a reduced appetite
- safeguarding: a worry about harm, fear, an unexplained injury, or something said that needs a person to look

Rules:
- Use only the note and the care notes. Do not invent facts.
- If the care notes list three concerns, return three flags.
- A care note that is only routine, such as a wash, a visit, or a drink taken as usual, is not a flag.
- title names that one concern in a few words.
- why is that one concern in the note's own words. Do not mention the other concerns. Never write "fact", "flag", "look", "diagnosis", or "decision".
- source is a short exact quote copied from the note, word for word, for that one concern.
- If there is no concern, return an empty flags list.

Example note: "She slept badly, left most of her lunch, and said her knee hurt."
Example care notes: "She slept badly." "She left most of her lunch." "She said her knee hurt."
Example flags: sleep "Slept badly"; nutrition "Left most of her lunch"; health "Knee hurt".
"""

HANDOVER_INSTRUCTIONS = """You advise on each resident in a residential home.

Rules:
- Use only the notes, saved handover lines, and open flags provided. Do not invent facts.
- Write advice for that resident, in plain prose, one short block per person.
- Say what would help them. Do not address a team or a handover of duties.
- Do not diagnose, advise medication, or decide safeguarding.
- Open flags are concerns to keep in mind. Say that they are not decisions.
- If a resident has no care note, say that nothing has been written yet.
"""

PERSON_HANDOVER_INSTRUCTIONS = """You advise on one resident.

Rules:
- One resident only. Do not mention anyone else.
- Write only the advice. One point per line. No introduction, no name, no paragraph.
- Use only the flags and incidents listed. Do not invent facts.
- If one concern is listed, advise on that concern only. Do not add sleep, meals, or anything else.
- Do not retell the flag or the incident. Do not say "there is a flag" or "there was an incident".
- Each line is advice for that person, starting with a verb.
- Say what would help the resident.
- Do not mention a shift, a team, or staff.
- For a safeguarding concern only, the advice is to tell the shift lead what was seen. Do not decide what happened.
- Do not diagnose, advise or change medication, or make a safeguarding decision.
- This is advice. A person decides what to save.
"""

CONCERN_HANDOVER_INSTRUCTIONS = """You advise on one concern for one resident.

Rules:
- points is exactly 3 short lines. Each line starts with a verb.
- Use only the concern listed. Do not invent facts.
- Stay on that concern. Do not add sleep, meals, appetite, hydration, diet, stress, or a journal unless that is the concern.
- Do not mention a shift, a team, staff, a doctor, or a healthcare professional.
- For a safeguarding concern only, one line may say to tell the shift lead what was seen. Do not decide what happened.
- Do not diagnose, advise or change medication, or make a safeguarding decision.
- Do not write the resident's name. Do not retell the flag. Do not say "there is a flag".
- This is advice. A person decides what to save.

Worsening fatigue:
- Stay with the usual routine
- Note where the tiredness gets in the way
- Offer a rest when they are tired
"""

HANDOVER_POINTS_FORMAT = {
    "type": "json_schema",
    "json_schema": {
        "name": "concern_handover",
        "strict": True,
        "schema": {
            "type": "object",
            "additionalProperties": False,
            "properties": {
                "points": {
                    "type": "array",
                    "minItems": 3,
                    "maxItems": 3,
                    "items": {"type": "string"},
                }
            },
            "required": ["points"],
        },
    },
}

_STAFF_WORDS = ("shift lead", "staff", "team", "healthcare", "doctor", "nurse", "professional", "carer")
_OTHER_CONCERNS = {
    "health": ("sleep", "meal", "appetite", "hydrat", "diet", "lunch", "breakfast", "journal", "stress", "relax"),
    "sleep": ("meal", "appetite", "hydrat", "diet", "lunch", "fatigue", "tired"),
    "nutrition": ("sleep", "fatigue", "tired", "hydrat", "fall"),
    "falls": ("meal", "sleep", "appetite", "fatigue", "tired"),
}

ACTION_INSTRUCTIONS = """You advise on each flag or incident selected for that resident.

Each flag or incident gets its own short list of points. A point is advice for the resident. It starts with a verb. It is something that would help them. It is not a restatement of the flag.

Rules:
- One list for every flag and every incident. Copy originKind and originId exactly.
- Use only that flag or incident. Do not invent facts, times, injuries, or events.
- points is 3 separate actions. Each point is one short line, starting with a verb. Do not start with "Review".
- Do not write a title or a paragraph. Only the points.
- For a flag, pick the practical checks or support that follow from what was seen.
  Worsening fatigue: "Stay with the usual routine" / "Note where the tiredness gets in the way" / "Offer a rest when they are tired"
  Disturbed sleep: "Offer a quieter settle tonight" / "Note whether sleep is still broken" / "Keep the late evening calm"
  Reduced appetite: "Sit with the next meal" / "Note how much is eaten" / "Offer the meal again later if it is left"
  A fall or unsteadiness: "Stay close on the next transfer" / "Note how steady they are when they stand" / "Keep the walk to the chair unhurried"
- For an incident, pick the follow-up from what was logged.
  A sudden headache and a rest: "Check in after the rest" / "Ask how the headache is now" / "Note if it returns"
- For a safeguarding concern, the points are to tell the shift lead what was seen. Do not decide what happened.
- Do not diagnose. Do not advise or change medication. Do not say risk, score, predict, or likely.
- Do not say "there is a flag" or "there was an incident".
- Do not write the resident's name. The action is already shown under that person.
- Do not name a room or assign the action to a person.
- This is advice. A person chooses what to keep.
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
                            "points": {
                                "type": "array",
                                "minItems": 3,
                                "maxItems": 3,
                                "items": {"type": "string"},
                            },
                        },
                        "required": ["originKind", "originId", "points"],
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
            },
            "required": ["points"],
        },
    },
}

FLAG_FORMAT = {
    "type": "json_schema",
    "json_schema": {
        "name": "care_flags",
        "strict": True,
        "schema": {
            "type": "object",
            "additionalProperties": False,
            "properties": {
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
            "required": ["flags"],
        },
    },
}


class DraftError(Exception):
    def __init__(self, detail: str, status: int = 502):
        super().__init__(detail)
        self.detail = detail
        self.status = status


def write_care_note(name: str, room: str, jot: str) -> tuple[list[str], list[dict], str]:
    """Return care notes from the writing, then one flag for each concern in them."""
    written = jot.strip()
    points = _care_points(name, written)
    flags = _concern_flags(name, written, points)
    return points, flags, "openai"


def _care_points(name: str, written: str) -> list[str]:
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
    return points


def _concern_flags(name: str, written: str, points: list[str]) -> list[dict]:
    care = "\n".join(f"- {point}" for point in points)
    raw = _complete(
        FLAG_INSTRUCTIONS,
        f"Person: {name}\nNote:\n{written}\n\nCare notes:\n{care}",
        FLAG_FORMAT,
    )
    try:
        data = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise DraftError("OpenAI did not return the concerns.") from exc

    flags = []
    for item in data.get("flags") or []:
        kind = str(item.get("kind", "")).strip()
        title = " ".join(str(item.get("title", "")).split()).strip()
        quote = _quote(written, str(item.get("source", ""))) or _sentence_span(
            written, f"{title} {item.get('why', '')}"
        )
        why = _grounded_why(item.get("why", ""), written, quote)
        if kind not in FLAG_KINDS or not title or not why or not quote:
            continue
        flag = {"kind": kind, "title": title[:180], "why": why[:800], "source": quote}
        if any(_same_concern(flag, saved) for saved in flags):
            continue
        flags.append(flag)
        if len(flags) == 8:
            break
    return flags


_INSTRUCTION_WHY = re.compile(
    r"fact in the note|a person should|should look|this is a flag|not a diagnosis|not a decision",
    re.IGNORECASE,
)
_CONTENT_WORDS = re.compile(r"[a-z]{4,}")
_STOP_WORDS = {
    "that",
    "this",
    "with",
    "from",
    "have",
    "has",
    "had",
    "been",
    "were",
    "their",
    "them",
    "they",
    "said",
    "says",
}


def _why(text: str) -> str:
    """Keep the reason, and drop the canned disclaimer the model used to append."""
    cleaned = " ".join(str(text).split()).strip()
    cleaned = re.sub(
        r"(?:\s*It is not a diagnosis or a decision\.?)+$",
        "",
        cleaned,
        flags=re.IGNORECASE,
    ).strip()
    return cleaned


def _content_words(text: str) -> set[str]:
    return {word for word in _CONTENT_WORDS.findall(text.lower()) if word not in _STOP_WORDS}


def _grounded_why(why: str, written: str, quote: str) -> str:
    """Use the model's reason only when it is actually in the note. Otherwise use the quote."""
    cleaned = _why(why)
    shared = _content_words(cleaned) & _content_words(written)
    if cleaned and not _INSTRUCTION_WHY.search(cleaned) and len(shared) >= 2:
        return cleaned
    return quote


def _same_concern(left: dict, right: dict) -> bool:
    """Two flags are the same concern when they share a kind and most of their words."""
    if left["kind"] != right["kind"]:
        return False
    left_words = _content_words(f"{left['title']} {left['why']}")
    right_words = _content_words(f"{right['title']} {right['why']}")
    if not left_words or not right_words:
        return False
    shared = len(left_words & right_words)
    return shared / min(len(left_words), len(right_words)) >= 0.6


def _sentence_span(written: str, hint: str) -> str:
    """Find the note sentence that actually contains this concern."""
    wanted = _content_words(hint)
    if len(wanted) < 2:
        return ""
    best = ""
    best_score = 1
    for sentence in re.split(r"(?<=[.!?])\s+", written):
        score = len(wanted & _content_words(sentence))
        if score > best_score:
            best_score = score
            best = sentence.strip()
    if best and best in written:
        return best[:240]
    return ""


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


def draft_shift_handover(
    residents: list[dict],
    flags: list[dict],
    home: str = "Riverside",
    notes: list[dict] | None = None,
) -> str:
    """Ask OpenAI for a handover from the notes and open flags already saved."""
    by_resident = _notes_by_resident(notes)
    has_saved = any(by_resident.values()) or any((person.get("day_note") or "").strip() for person in residents)
    if not has_saved:
        raise DraftError("Write a care note before drafting the handover.", status=400)

    lines = [f"Home: {home}", ""]
    for person in residents:
        note = _note_text(person, by_resident.get(person["id"], []))
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


def draft_concern_handover(
    flags: list[dict],
    incidents: list[dict],
    action: dict | None = None,
) -> str:
    """Advise on one flag or one incident, without the rest of the care note."""
    sources = _care_sources(flags, incidents)
    if not sources:
        raise DraftError("A flag or an incident is needed before drafting the handover.", status=400)
    lines = [
        "The person is already chosen. Do not write their name.",
        "Write 3 points for this concern only:",
    ]
    for source in sources:
        lines.append(f"- {source['kind']} ({source['label']}): {source['text']}")
    chosen = ""
    if action:
        chosen = (action.get("detail") or action.get("title") or "").strip()
    if chosen:
        lines.append("The action already saved for this concern:")
        lines.append(chosen)
        lines.append("Keep the handover on that same concern.")
    raw = _complete(CONCERN_HANDOVER_INSTRUCTIONS, "\n".join(lines), HANDOVER_POINTS_FORMAT)
    text = _keep_concern_points(raw, sources)
    if not text:
        raise DraftError("OpenAI did not stay on that concern.", status=400)
    return text[:4000]


def _keep_concern_points(raw: str, sources: list[dict]) -> str:
    try:
        data = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise DraftError("OpenAI did not return a handover.") from exc
    labels = {source.get("label", "") for source in sources}
    safeguarding = "safeguarding" in labels
    banned = set()
    for label in labels:
        banned.update(_OTHER_CONCERNS.get(label, ()))
    points = []
    for raw_point in data.get("points") or []:
        point = " ".join(str(raw_point).split()).strip(" -•\t")
        low = point.lower()
        if not point:
            continue
        if not safeguarding and any(word in low for word in _STAFF_WORDS):
            continue
        if any(word in low for word in banned):
            continue
        points.append(point[:160])
        if len(points) == 3:
            break
    return "\n".join(points)


def draft_resident_handover(
    resident: dict,
    flags: list[dict],
    incidents: list[dict],
    notes: list[dict] | None = None,
) -> str:
    """Ask OpenAI for one resident's handover from their flags and incidents."""
    if not _care_sources(flags, incidents):
        raise DraftError("A flag or an incident is needed before drafting the handover.", status=400)
    text = _complete(
        PERSON_HANDOVER_INSTRUCTIONS,
        _resident_brief(resident, flags, incidents, notes),
    ).strip()
    if not text:
        raise DraftError("OpenAI returned an empty handover.")
    return text[:4000]


def draft_resident_actions(
    resident: dict,
    flags: list[dict],
    incidents: list[dict],
    notes: list[dict] | None = None,
) -> list[dict]:
    """Ask OpenAI for one action per flag and incident."""
    sources = _care_sources(flags, incidents)
    if not sources:
        raise DraftError("A flag or an incident is needed before drafting actions.", status=400)
    brief = _resident_brief(resident, flags, incidents, notes).split("\n", 1)[-1]
    raw = _complete(
        ACTION_INSTRUCTIONS,
        "The person is already chosen. Do not write their name.\n" + brief,
        ACTION_FORMAT,
    )
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
        points = []
        for raw_point in item.get("points") or []:
            point = " ".join(str(raw_point).split()).strip(" -•\t")
            if point:
                points.append(point[:160])
        points = points[:3]
        if origin_id in seen or allowed.get(origin_id) != origin_kind:
            continue
        if not points:
            continue
        seen.add(origin_id)
        drafted.append(
            {
                "title": points[0],
                "assignee": "",
                "detail": "\n".join(points)[:500],
                "points": points,
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


def _notes_by_resident(notes: list[dict] | None) -> dict[str, list[str]]:
    grouped: dict[str, list[str]] = {}
    for note in notes or []:
        text = (note.get("day_note") or "").strip()
        if text:
            grouped.setdefault(note["resident_id"], []).append(text)
    return grouped


def _note_text(resident: dict, written: list[str]) -> str:
    if written:
        return "\n".join(written)
    saved = (resident.get("day_note") or "").strip()
    return saved or "Nothing written yet."


def _resident_brief(
    resident: dict,
    flags: list[dict],
    incidents: list[dict] | None = None,
    notes: list[dict] | None = None,
) -> str:
    written = _notes_by_resident(notes).get(resident["id"], [])
    note = _note_text(resident, written)
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
