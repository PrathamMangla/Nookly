import { ROLES } from "./roles.js";

const KEY = "nookly-session";

export function readSession() {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    const role = ROLES.find((item) => item.role === session.role);
    if (!session.id || !role) return null;
    return { ...session, path: role.path, roleLabel: role.label, name: role.name };
  } catch {
    return null;
  }
}

export function writeSession(user) {
  const role = ROLES.find((item) => item.role === user.role);
  if (!role) return null;
  const session = {
    id: user.id,
    name: role.name,
    role: role.role,
    roleLabel: role.label,
    path: role.path,
  };
  sessionStorage.setItem(KEY, JSON.stringify(session));
  return session;
}

export function clearSession() {
  sessionStorage.removeItem(KEY);
}
