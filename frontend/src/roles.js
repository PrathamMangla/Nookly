export const LOGINS = [
  {
    name: "Priya Shah",
    label: "Support worker",
    email: "priya.shah@riverside.care",
  },
  {
    name: "Hannah Brooks",
    label: "Shift lead",
    email: "hannah.brooks@riverside.care",
  },
  {
    name: "Daniel Adeyemi",
    label: "Manager",
    email: "daniel.adeyemi@riverside.care",
  },
  {
    name: "Alex Morgan",
    label: "System admin",
    email: "alex.morgan@riverside.care",
  },
];

export const DEMO_PASSWORD = "riverside";

export const ROLES = [
  {
    id: "support-worker",
    role: "support_worker",
    label: "Support worker",
    name: "Priya Shah",
    scope: "Writes notes, reads the handover, and logs incidents for assigned residents.",
    path: "/dashboards/support-worker",
  },
  {
    id: "shift-lead",
    role: "shift_lead",
    label: "Shift lead",
    name: "Hannah Brooks",
    scope: "Reviews flags, assigns actions, approves notes, and publishes the handover.",
    path: "/dashboards/shift-lead",
  },
  {
    id: "manager",
    role: "manager",
    label: "Manager",
    name: "Daniel Adeyemi",
    scope: "Open actions, notes, flags, and incidents for this shift.",
    path: "/dashboards/manager",
  },
  {
    id: "admin",
    role: "system_admin",
    label: "System admin",
    name: "Alex Morgan",
    scope: "Users, roles, settings, and the audit trail. No care decisions.",
    path: "/dashboards/admin",
  },
];

export const ACCESS = [
  {
    id: "support-worker",
    label: "Support worker",
    line: "Assigned residents only.",
    can: ["Care notes, with the original kept", "The published handover", "Incidents for assigned residents"],
    cannot: ["Approve or publish the handover", "Change who can sign in"],
  },
  {
    id: "shift-lead",
    label: "Shift lead",
    line: "The shift, not the user list.",
    can: ["Explainable concern flags", "Communication book actions", "Approve notes and publish the handover"],
    cannot: ["Diagnose, advise medication, or decide safeguarding", "Change roles"],
  },
  {
    id: "manager",
    label: "Manager",
    line: "Oversight of the service.",
    can: ["Incidents and how they are tracking", "Shift counts", "Service settings"],
    cannot: ["Edit a care note", "Manage logins"],
  },
  {
    id: "admin",
    label: "System admin",
    line: "Access only. No care decisions.",
    can: ["Users and roles", "System settings", "The audit trail"],
    cannot: ["Care decisions", "Note text or flag detail"],
  },
];

export const today = new Intl.DateTimeFormat("en-GB", {
  weekday: "long",
  day: "numeric",
  month: "long",
}).format(new Date());
