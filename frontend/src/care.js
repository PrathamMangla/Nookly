export const FLAG_KINDS = [
  { id: "falls", label: "Falls" },
  { id: "health", label: "Health" },
  { id: "safeguarding", label: "Safeguarding" },
  { id: "sleep", label: "Sleep" },
  { id: "nutrition", label: "Nutrition" },
];

export const INCIDENT_KINDS = [
  { id: "fall", label: "Fall" },
  { id: "near_miss", label: "Near miss" },
  { id: "health", label: "Health" },
  { id: "other", label: "Other" },
];

export const INCIDENT_STATUS = [
  { id: "open", label: "Open" },
  { id: "tracking", label: "Tracking" },
  { id: "closed", label: "Closed" },
];

export function carePoints(person) {
  if (Array.isArray(person?.points) && person.points.length) return person.points;
  if (!person?.dayNote) return [];
  return person.dayNote.split("\n").map((line) => line.trim()).filter(Boolean);
}

export function labelFor(list, id) {
  return list.find((item) => item.id === id)?.label || id;
}

const STATUS_RANK = { open: 0, tracking: 1, reviewed: 1, done: 1, closed: 2 };

export function byStatus(rows) {
  return [...rows].sort((a, b) => (STATUS_RANK[a.status] ?? 9) - (STATUS_RANK[b.status] ?? 9));
}

export function residentSources(residentId, flags, incidents) {
  return {
    flags: (flags || []).filter((flag) => flag.residentId === residentId),
    incidents: (incidents || []).filter(
      (incident) => incident.residentId === residentId && incident.status !== "closed",
    ),
  };
}

export function sourceText(item, flags, incidents) {
  const flag = (flags || []).find((entry) => entry.id === item.flagId);
  if (flag) return `Flag · ${labelFor(FLAG_KINDS, flag.kind)} · ${flag.title}`;
  const incident = (incidents || []).find((entry) => entry.id === item.incidentId);
  if (incident) return `Incident · ${labelFor(INCIDENT_KINDS, incident.kind)} · ${incident.summary}`;
  return "";
}
