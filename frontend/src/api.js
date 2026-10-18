const API_URL = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    let detail = "The request did not go through.";
    try {
      const body = await response.json();
      if (typeof body.detail === "string" && body.detail) detail = body.detail;
    } catch {
      /* The body was not JSON. */
    }
    throw new Error(detail);
  }

  return response.json();
}

export function getDesk() {
  return request("/api/desk");
}

export function updateTags(id, tags) {
  return request(`/api/residents/${id}/tags`, {
    method: "PATCH",
    body: JSON.stringify({ tags }),
  });
}

export function createResident(body) {
  return request("/api/residents", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function getResidents() {
  return request("/api/residents");
}

export function getUsers() {
  return request("/api/users");
}

export function login(email, password) {
  return request("/api/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function sendNote(id, sent) {
  return request(`/api/notes/${id}/send`, {
    method: "POST",
    body: JSON.stringify({ sent }),
  });
}

export function approveNote(id, approved) {
  return request(`/api/notes/${id}/approve`, {
    method: "POST",
    body: JSON.stringify({ approved }),
  });
}

export function savePoints(id, points) {
  return request(`/api/notes/${id}/points`, {
    method: "PUT",
    body: JSON.stringify({ points }),
  });
}

export function draftNote(id, jot) {
  return request(`/api/residents/${id}/notes`, {
    method: "POST",
    body: JSON.stringify({ jot }),
  });
}

export function saveHandover(id, handover) {
  return request(`/api/residents/${id}/handover`, {
    method: "PUT",
    body: JSON.stringify({ handover }),
  });
}

export function draftResidentHandover(id) {
  return request(`/api/residents/${id}/handover/draft`, { method: "POST" });
}

export function adviseResidentHandover(id) {
  return request(`/api/residents/${id}/handover/advice`, { method: "POST" });
}

export function adviseActionHandover(id) {
  return request(`/api/actions/${id}/handover/advice`, { method: "POST" });
}

export function saveActionHandover(id, handover) {
  return request(`/api/actions/${id}/handover`, {
    method: "PUT",
    body: JSON.stringify({ handover }),
  });
}

export function draftResidentActions(id) {
  return request(`/api/residents/${id}/actions/draft`, { method: "POST" });
}

export function adviseResidentActions(id, flagIds, incidentIds) {
  return request(`/api/residents/${id}/actions/advice`, {
    method: "POST",
    body: JSON.stringify({ flagIds, incidentIds }),
  });
}

export function getFlags() {
  return request("/api/flags");
}

export function getIncidents() {
  return request("/api/incidents");
}

export function getActions() {
  return request("/api/actions");
}

export function getAudit() {
  return request("/api/audit");
}

export function getSettings() {
  return request("/api/settings");
}

export function getShift() {
  return request("/api/shift");
}

export function createIncident(residentId, kind, summary) {
  return request("/api/incidents", {
    method: "POST",
    body: JSON.stringify({ residentId, kind, summary }),
  });
}

export function updateIncident(id, status) {
  return request(`/api/incidents/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export function reviewFlag(id, status) {
  return request(`/api/flags/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export function saveFlag(id, body) {
  return request(`/api/flags/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export function createAction(body) {
  return request("/api/actions", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function updateAction(id, status) {
  return request(`/api/actions/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export function saveShift(draft) {
  return request("/api/shift", {
    method: "PUT",
    body: JSON.stringify({ draft }),
  });
}

export function redraftShift() {
  return request("/api/shift/draft", { method: "POST" });
}

export function publishShift() {
  return request("/api/shift/publish", { method: "POST" });
}

export function saveSetting(group, id, value) {
  return request(`/api/settings/${group}/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ value }),
  });
}
