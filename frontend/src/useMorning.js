import { useEffect, useState } from "react";
import {
  approveNote,
  createAction,
  createIncident,
  createResident,
  draftNote,
  draftResidentActions,
  draftResidentHandover,
  getAudit,
  getFlags,
  getDesk,
  publishShift,
  redraftShift,
  reviewFlag as reviewFlagRequest,
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
        setUsers(desk.users);
        setFlags(desk.flags);
        setIncidents(desk.incidents);
        setActions(desk.actions);
        setAudit(desk.audit);
        setSettings(desk.settings);
        setShift(desk.shift);
        setError("");
      } catch (err) {
        if (!ignore) setError(err.message || "The shift could not be loaded.");
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
    users,
    flags,
    incidents,
    actions,
    audit,
    settings,
    shift,
    error,
    busyId,
    send: (id, sent) => run(id, () => sendNote(id, sent), replaceResident),
    approve: (id, approved) => run(id, () => approveNote(id, approved), replaceResident),
    draft: (id, jot) =>
      run(`draft-${id}`, () => draftNote(id, jot), async (next) => {
        replaceResident(next);
        setFlags(await getFlags());
      }),
    saveTags: (id, tags) => run(`tags-${id}`, () => updateTags(id, tags), replaceResident),
    savePoints: (id, points) => run(id, () => savePoints(id, points), replaceResident),
    addResident: (body) =>
      run("resident-new", () => createResident(body), (created) => {
        setResidents((current) => [...current, created]);
      }),
    writeHandover: (id, handover) =>
      run(`handover-${id}`, () => saveHandover(id, handover), replaceResident),
    draftResidentHandover: (id) =>
      run(`handover-${id}`, () => draftResidentHandover(id), replaceResident),
    logIncident: (residentId, kind, summary) =>
      run(`incident-${residentId}`, () => createIncident(residentId, kind, summary), (created) => {
        setIncidents((current) => [created, ...current]);
      }),
    trackIncident: (id, status) =>
      run(id, () => updateIncident(id, status), (next) => replaceById(setIncidents, next)),
    reviewFlag: (id, status) =>
      run(id, () => reviewFlagRequest(id, status), (next) => replaceById(setFlags, next)),
    assignAction: (body) =>
      run("action-new", () => createAction(body), (created) => {
        setActions((current) => [created, ...current]);
      }),
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
