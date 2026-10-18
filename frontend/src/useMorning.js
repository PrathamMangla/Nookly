import { useEffect, useState } from "react";
import {
  approveNote,
  createAction,
  createIncident,
  createResident,
  adviseResidentActions,
  adviseActionHandover,
  adviseResidentHandover,
  saveActionHandover,
  draftNote,
  draftResidentActions,
  draftResidentHandover,
  getAudit,
  getFlags,
  getDesk,
  publishShift,
  redraftShift,
  reviewFlag as reviewFlagRequest,
  saveFlag,
  saveHandover,
  saveSetting as saveSettingRequest,
  savePoints,
  saveShift,
  sendNote,
  updateAction,
  updateIncident,
  updateTags,
} from "./api.js";

export function useMorning() {
  const [residents, setResidents] = useState(null);
  const [notes, setNotes] = useState(null);
  const [users, setUsers] = useState(null);
  const [flags, setFlags] = useState(null);
  const [incidents, setIncidents] = useState(null);
  const [actions, setActions] = useState(null);
  const [audit, setAudit] = useState(null);
  const [settings, setSettings] = useState(null);
  const [shift, setShift] = useState(null);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");

  useEffect(() => {
    let ignore = false;

    async function load() {
      try {
        const desk = await getDesk();
        if (ignore) return;
        setResidents(desk.residents);
        setNotes(desk.notes);
        setUsers(desk.users);
        setFlags(desk.flags);
        setIncidents(desk.incidents);
        setActions(desk.actions);
        setAudit(desk.audit);
        setSettings(desk.settings);
        setShift(desk.shift);
        setError("");
      } catch (err) {
        if (!ignore) setError(err.message || "The desk could not be loaded.");
      }
    }

    load();
    return () => {
      ignore = true;
    };
  }, []);

  function replaceResident(next) {
    setResidents((current) => current.map((item) => (item.id === next.id ? { ...item, ...next } : item)));
  }

  function replaceNote(next) {
    setNotes((current) => current.map((item) => (item.id === next.id ? next : item)));
  }

  function replaceById(setter, next) {
    setter((current) => current.map((item) => (item.id === next.id ? next : item)));
  }

  async function refreshAudit() {
    try {
      setAudit(await getAudit());
    } catch {
      /* The change itself succeeded. */
    }
  }

  async function run(id, action, apply) {
    setBusyId(id);
    setError("");
    try {
      const result = await action();
      if (apply) await apply(result);
      await refreshAudit();
      return result;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setBusyId("");
    }
  }

  return {
    residents,
    notes,
    users,
    flags,
    incidents,
    actions,
    audit,
    settings,
    shift,
    error,
    busyId,
    send: (id, sent) => run(id, () => sendNote(id, sent), replaceNote),
    approve: (id, approved) => run(id, () => approveNote(id, approved), replaceNote),
    draft: (id, jot) =>
      run(`draft-${id}`, () => draftNote(id, jot), async (created) => {
        setNotes((current) => [created, ...(current || [])]);
        setFlags(await getFlags());
      }),
    saveTags: (id, tags) => run(`tags-${id}`, () => updateTags(id, tags), replaceResident),
    savePoints: (id, points) => run(id, () => savePoints(id, points), replaceNote),
    addResident: (body) =>
      run("resident-new", () => createResident(body), (created) => {
        setResidents((current) => [created, ...(current || [])]);
      }),
    writeHandover: (id, handover) =>
      run(`handover-${id}`, () => saveHandover(id, handover), replaceResident),
    draftResidentHandover: (id) =>
      run(`handover-${id}`, () => draftResidentHandover(id), replaceResident),
    adviseHandover: (id) => run(`advice-${id}`, () => adviseResidentHandover(id)),
    adviseActionHandover: (id) => run(`advice-${id}`, () => adviseActionHandover(id)),
    saveActionHandover: (id, handover) =>
      run(`handover-${id}`, () => saveActionHandover(id, handover), (next) => {
        setActions((current) => {
          const actions = (current || []).map((item) => (item.id === next.id ? next : item));
          const text = actions
            .filter((item) => item.residentId === next.residentId && String(item.handover || "").trim())
            .sort((a, b) => (Date.parse(b.at || "") || 0) - (Date.parse(a.at || "") || 0))
            .map((item) => `${item.title}\n${item.handover.trim()}`)
            .join("\n\n");
          setResidents((people) =>
            (people || []).map((person) => (person.id === next.residentId ? { ...person, handover: text } : person)),
          );
          return actions;
        });
      }),
    logIncident: (residentId, kind, summary) =>
      run(`incident-${residentId}`, () => createIncident(residentId, kind, summary), (created) => {
        setIncidents((current) => [created, ...current]);
      }),
    trackIncident: (id, status) =>
      run(id, () => updateIncident(id, status), (next) => replaceById(setIncidents, next)),
    reviewFlag: (id, status) =>
      run(id, () => reviewFlagRequest(id, status), (next) => replaceById(setFlags, next)),
    saveFlag: (id, body) =>
      run(`flag-edit-${id}`, () => saveFlag(id, body), (next) => replaceById(setFlags, next)),
    assignAction: (body, busyKey = "action-new") =>
      run(busyKey, () => createAction(body), (created) => {
        setActions((current) => [created, ...current]);
      }),
    adviseActions: (id, flagIds, incidentIds) =>
      run(`actions-${id}`, () => adviseResidentActions(id, flagIds, incidentIds)),
    draftActions: (id) =>
      run(`actions-${id}`, () => draftResidentActions(id), (created) => {
        setActions((current) => [
          ...created,
          ...current.filter(
            (item) => !(item.residentId === id && item.source === "openai" && item.status === "open"),
          ),
        ]);
      }),
    completeAction: (id, status) =>
      run(id, () => updateAction(id, status), (next) => replaceById(setActions, next)),
    saveShiftDraft: (draftText) => run("shift", () => saveShift(draftText), setShift),
    redraft: () => run("shift", () => redraftShift(), setShift),
    publish: () => run("shift", () => publishShift(), setShift),
    saveSetting: (group, id, value) =>
      run(id, () => saveSettingRequest(group, id, value), (next) => replaceById(setSettings, next)),
  };
}
