import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import {
  byStatus,
  carePoints,
  FLAG_KINDS,
  INCIDENT_KINDS,
  INCIDENT_STATUS,
  labelFor,
  residentSources,
  sourceText,
} from "../care.js";
import { DeskIntro, Stats, Status, Tabs } from "../components/DashBits.jsx";
import { Spin } from "../components/Spinner.jsx";
import { ROLES } from "../roles.js";
import {
  actions,
  area,
  btn,
  cardTitle,
  field,
  fieldLabel,
  finding,
  findingTitle,
  ghost,
  kick,
  meta,
  noteDesk,
  point,
  points,
  record,
  recordHead,
  recordTitle,
  sectionLabel,
  settled,
  sheet,
  sheetHead,
  sourceQuote,
  stack,
  tag,
} from "../ui.js";

const role = ROLES[1];
const TABS = [
  { id: "approvals", label: "Approvals" },
  { id: "actions", label: "Actions" },
  { id: "handover", label: "Handover" },
];
const APPROVAL_TABS = [
  { id: "notes", label: "Notes" },
  { id: "flags", label: "Flags" },
  { id: "incidents", label: "Incidents" },
];
const labelClass = "mb-2 mt-3.5 block text-xs font-semibold tracking-[0.12em] text-soft uppercase";
const incidentKick = "text-[0.72rem] font-semibold tracking-[0.14em] text-navy uppercase";

function withoutName(text, name) {
  const first = String(name || "")
    .trim()
    .split(/\s+/)
    .find((part) => part.length > 1);
  let next = String(text || "").replace(/\s+/g, " ").trim();
  if (!first) return next;
  const token = first.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const led = new RegExp(`^${token}(?:'s)?\\b[,\\s]*`, "i");
  if (!led.test(next)) return next;
  next = next.replace(led, "").replace(/\s{2,}/g, " ").trim();
  if (!next) return "";
  return next.charAt(0).toUpperCase() + next.slice(1);
}

function noteLabel(note) {
  if (!note) return "";
  const text = String(note.jot || "").replace(/\s+/g, " ").trim();
  const clip = text.length > 96 ? `${text.slice(0, text.lastIndexOf(" ", 96) > 40 ? text.lastIndexOf(" ", 96) : 96)}…` : text;
  const when = note.when ? note.when : "";
  return [when, clip].filter(Boolean).join(" · ");
}

function actionPoints(item) {
  const listed = (item?.points || []).map((point) => String(point || "").trim()).filter(Boolean);
  if (listed.length) return listed;
  const lines = String(item?.detail || "")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length > 1) return lines;
  const title = String(item?.title || "").trim();
  const detail = lines[0] || "";
  if (title && detail && title !== detail) return [title, detail];
  return [title || detail].filter(Boolean);
}

export default function SeniorPage() {
  const {
    residents,
    notes,
    flags,
    incidents,
    actions: shiftActions,
    shift,
    error,
    busyId,
    approve,
    savePoints,
    reviewFlag,
    saveFlag,
    trackIncident,
    assignAction,
    adviseActions,
    completeAction,
    adviseActionHandover,
    saveActionHandover,
  } = useOutletContext();
  const [tab, setTab] = useState("approvals");
  const [approvalTab, setApprovalTab] = useState("notes");
  const [residentId, setResidentId] = useState("arthur");
  const [pickedFlags, setPickedFlags] = useState([]);
  const [pickedIncidents, setPickedIncidents] = useState([]);
  const [sourceTab, setSourceTab] = useState("flags");
  const [adviceByResident, setAdviceByResident] = useState({});
  const [handoverAdvice, setHandoverAdvice] = useState({});

  const ready = Boolean(residents && notes && flags && incidents && shiftActions && shift);
  const openFlags = flags?.filter((item) => item.status === "open") || [];
  const waiting = notes?.filter((item) => item.sent && !item.approved) || [];
  const openActions = shiftActions?.filter((item) => item.status === "open") || [];
  const actionResidentId = residents?.some((item) => item.id === residentId)
    ? residentId
    : residents?.[0]?.id || "";
  const actionResident = residents?.find((item) => item.id === actionResidentId);
  const actionSources = actionResident ? residentSources(actionResident.id, flags, incidents) : { flags: [], incidents: [] };
  const shownAdvice = adviceByResident[actionResidentId] || [];
  const selectedFlags = actionSources.flags.filter((flag) => pickedFlags.includes(flag.id));
  const selectedIncidents = actionSources.incidents.filter((item) => pickedIncidents.includes(item.id));
  const selectedCount = selectedFlags.length + selectedIncidents.length;
  const personActions = (shiftActions || []).filter((item) => item.residentId === actionResidentId);

  function adviceSource(item) {
    const flag = (flags || []).find((entry) => entry.id === item.flagId);
    if (flag) return `Flag · ${labelFor(FLAG_KINDS, flag.kind)} · ${flag.title}`;
    const incident = (incidents || []).find((entry) => entry.id === item.incidentId);
    if (!incident) return "";
    return `Incident · ${labelFor(INCIDENT_KINDS, incident.kind)} · ${withoutName(incident.summary, actionResident?.name)}`;
  }

  function adviceNote(item) {
    const flag = (flags || []).find((entry) => entry.id === item.flagId);
    const note = (notes || []).find((entry) => entry.id === flag?.noteId);
    return noteLabel(note);
  }

  async function takeAdvice(suggestion) {
    const saved = await assignAction(
      {
        residentId: actionResidentId,
        title: suggestion.title,
        detail: suggestion.detail,
        flagId: suggestion.flagId || "",
        incidentId: suggestion.incidentId || "",
      },
      `assign-${suggestion.flagId || suggestion.incidentId}`,
    );
    if (!saved) return;
    setAdviceByResident((current) => ({
      ...current,
      [actionResidentId]: (current[actionResidentId] || []).filter(
        (item) => item.flagId !== suggestion.flagId || item.incidentId !== suggestion.incidentId,
      ),
    }));
  }

  async function createActions() {
    const result = await adviseActions(
      actionResidentId,
      selectedFlags.map((flag) => flag.id),
      selectedIncidents.map((item) => item.id),
    );
    if (!result?.actions) return;
    setAdviceByResident((current) => ({
      ...current,
      [actionResidentId]: result.actions,
    }));
    setSourceTab("actions");
  }

  return (
    <>
      <DeskIntro role={role} />
      <Status error={error} ready={ready} />
      {ready && (
        <>
          <Stats
            items={[
              { label: "Flags to review", value: openFlags.length },
              { label: "Incidents", value: incidents.length },
              { label: "Notes to approve", value: waiting.length },
              { label: "Open actions", value: openActions.length },
            ]}
          />
          <Tabs tabs={TABS} current={tab} onChange={setTab} label="Shift lead" />
          {tab === "approvals" && (
            <section className={stack}>
              <Tabs tabs={APPROVAL_TABS} current={approvalTab} onChange={setApprovalTab} label="Approvals" />
              {approvalTab === "flags" && (
                <FlagGroups
                  notes={notes}
                  flags={flags}
                  busyId={busyId}
                  onReview={reviewFlag}
                  onSave={saveFlag}
                />
              )}
              {approvalTab === "incidents" && (
                <>
                  <p className="rounded-xl bg-paper px-3.5 py-3 text-body">
                    An incident is what the carer logged. It is not a flag.
                  </p>
                  {incidents.length === 0 && <p className={settled}>No incidents logged yet.</p>}
                  {byStatus(incidents).map((incident) => (
                    <IncidentCard
                      key={incident.id}
                      incident={incident}
                      busyId={busyId}
                      onTrack={trackIncident}
                    />
                  ))}
                </>
              )}
              {approvalTab === "notes" && (
                <>
                  <p className="rounded-xl bg-paper px-3.5 py-3 text-body">
                    Check the carer’s own words, then approve the note.
                  </p>
                  {notes.length === 0 && (
                    <p className={settled}>No notes yet. They appear after the support worker writes them.</p>
                  )}
                  {notes.map((note) => (
                    <NoteReview
                      key={note.id}
                      note={note}
                      busyId={busyId}
                      onSave={savePoints}
                      onApprove={approve}
                    />
                  ))}
                </>
              )}
            </section>
          )}
          {tab === "actions" && (
            <section className={`${noteDesk} min-w-0`}>
              <p className="rounded-xl bg-paper px-3.5 py-3 text-body">
                Choose a name. Create from flags or incidents. Generated actions shows the points.
              </p>
              {residents.length === 0 ? (
                <p className={settled}>Add a resident before assigning an action.</p>
              ) : (
                <>
                  <div>
                    <p className={fieldLabel}>Name</p>
                    <div className="flex flex-wrap gap-2">
                      {residents.map((person) => {
                        const chosen = person.id === actionResidentId;
                        return (
                          <button
                            key={person.id}
                            type="button"
                            aria-pressed={chosen}
                            className={chosen ? btn : ghost}
                            onClick={() => setResidentId(person.id)}
                          >
                            {person.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <Tabs
                    label="Flags or incidents"
                    tabs={[
                      { id: "flags", label: "Flags" },
                      { id: "incidents", label: "Incidents" },
                      { id: "actions", label: "Generated actions" },
                    ]}
                    current={sourceTab}
                    onChange={setSourceTab}
                  />
                  {sourceTab === "flags" && (
                    <div className="min-w-0">
                      <p className="mb-2.5 text-sm font-medium text-soft">{selectedFlags.length} selected</p>
                      {actionSources.flags.length === 0 && <p className={settled}>No flags yet.</p>}
                      <div className={stack}>
                        {actionSources.flags.map((flag) => (
                          <SourceCard
                            key={flag.id}
                            kind="Flag"
                            label={labelFor(FLAG_KINDS, flag.kind)}
                            title={flag.title}
                            detail={withoutName(flag.why, actionResident.name)}
                            from={noteLabel(notes.find((note) => note.id === flag.noteId))}
                            selected={pickedFlags.includes(flag.id)}
                            onSelect={() =>
                              setPickedFlags((current) =>
                                current.includes(flag.id)
                                  ? current.filter((id) => id !== flag.id)
                                  : [...current, flag.id],
                              )
                            }
                          />
                        ))}
                      </div>
                      <GenerateActions
                        count={selectedCount}
                        busy={busyId === `actions-${actionResidentId}`}
                        onCreate={createActions}
                      />
                    </div>
                  )}
                  {sourceTab === "incidents" && (
                    <div className="min-w-0">
                      <p className="mb-2.5 text-sm font-medium text-soft">{selectedIncidents.length} selected</p>
                      {actionSources.incidents.length === 0 && <p className={settled}>No open incidents.</p>}
                      <div className={stack}>
                        {actionSources.incidents.map((incident) => (
                          <SourceCard
                            key={incident.id}
                            kind="Incident"
                            label={labelFor(INCIDENT_KINDS, incident.kind)}
                            title={withoutName(incident.summary, actionResident.name)}
                            selected={pickedIncidents.includes(incident.id)}
                            onSelect={() =>
                              setPickedIncidents((current) =>
                                current.includes(incident.id)
                                  ? current.filter((id) => id !== incident.id)
                                  : [...current, incident.id],
                              )
                            }
                          />
                        ))}
                      </div>
                      <GenerateActions
                        count={selectedCount}
                        busy={busyId === `actions-${actionResidentId}`}
                        onCreate={createActions}
                      />
                    </div>
                  )}
                  {sourceTab === "actions" && (
                    <div className={stack}>
                      {shownAdvice.length === 0 && personActions.length === 0 && (
                        <p className={settled}>Generated actions show here.</p>
                      )}
                      {shownAdvice.map((item) => (
                        <ActionDraft
                          key={item.flagId || item.incidentId}
                          item={item}
                          source={adviceSource(item)}
                          note={adviceNote(item)}
                          busy={busyId === `assign-${item.flagId || item.incidentId}`}
                          onSave={takeAdvice}
                        />
                      ))}
                      {personActions.map((item) => (
                        <article className={`${record} min-w-0`} key={item.id}>
                          <header className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <ActionSource item={item} flags={flags} incidents={incidents} notes={notes} name={actionResident.name} />
                            </div>
                            <button
                              type="button"
                              className={`${item.status === "done" ? ghost : btn} shrink-0 whitespace-nowrap`}
                              disabled={busyId === item.id}
                              onClick={() => completeAction(item.id, item.status === "done" ? "open" : "done")}
                            >
                              <Spin on={busyId === item.id} />
                              {item.status === "done" ? "Done" : "Mark done"}
                            </button>
                          </header>
                          <ActionPoints points={actionPoints(item).map((point) => withoutName(point, actionResident.name))} />
                        </article>
                      ))}
                    </div>
                  )}
                </>
              )}
            </section>
          )}
          {tab === "handover" && (
            <section className={stack}>
              <p className="rounded-xl bg-paper px-3.5 py-3 text-body">
                Each saved action has its own handover, from the flag or incident it came from.
              </p>
              {residents.length === 0 && <p className={settled}>No residents yet.</p>}
              {residents.map((person) => (
                <ResidentHandover
                  key={person.id}
                  person={person}
                  tasks={byStatus(shiftActions).filter((item) => item.residentId === person.id && (item.flagId || item.incidentId))}
                  flags={flags}
                  incidents={incidents}
                  advice={handoverAdvice}
                  busyId={busyId}
                  onSave={saveActionHandover}
                  onAdvise={async (id) => {
                    const result = await adviseActionHandover(id);
                    if (!result?.advice) return;
                    setHandoverAdvice((current) => ({ ...current, [id]: result.advice }));
                  }}
                />
              ))}
            </section>
          )}
        </>
      )}
    </>
  );
}

function flagCount(count) {
  return count === 1 ? "1 flag" : `${count} flags`;
}

function FlagGroups({ notes, flags, busyId, onReview, onSave }) {
  const grouped = new Set();
  const groups = notes
    .map((note) => {
      const mine = flags.filter((flag) => flag.noteId === note.id);
      mine.forEach((flag) => grouped.add(flag.id));
      return { note, flags: mine };
    })
    .filter((group) => group.flags.length);
  const loose = flags.filter((flag) => !grouped.has(flag.id));

  return (
    <>
      <p className="rounded-xl bg-paper px-3.5 py-3 text-body">
        Flags are grouped with the note and the care notes they came from. A flag is not a diagnosis or a
        decision.
      </p>
      {flags.length === 0 && (
        <p className={settled}>
          No flags yet. Each concern in a note, such as a fall, health, sleep, or eating, appears here with
          that note.
        </p>
      )}
      {groups.map((group) => (
        <NoteFlagGroup
          key={group.note.id}
          note={group.note}
          flags={group.flags}
          busyId={busyId}
          onReview={onReview}
          onSave={onSave}
        />
      ))}
      {loose.map((flag) => (
        <FlagCard key={flag.id} flag={flag} busyId={busyId} onReview={onReview} onSave={onSave} />
      ))}
    </>
  );
}

function NoteFlagGroup({ note, flags, busyId, onReview, onSave }) {
  const lines = carePoints(note);
  return (
    <article className={sheet}>
      <header className={sheetHead}>
        <div>
          <h2 className={cardTitle}>{note.residentName}</h2>
          <p className="text-soft">{note.when}</p>
        </div>
        <p className="text-sm font-semibold text-ink">{flagCount(flags.length)}</p>
      </header>
      <div className="mt-4 grid gap-3">
        <section className={finding}>
          <h3 className={findingTitle}>Note</h3>
          <p className="mt-2 whitespace-pre-wrap rounded-xl border border-line bg-white px-3.5 py-3 leading-relaxed">
            {note.jot || "Nothing written yet."}
          </p>
        </section>
        <section className={finding}>
          <h3 className={findingTitle}>Care notes</h3>
          {lines.length === 0 ? (
            <p className={`${meta} mt-2`}>No care notes for this note.</p>
          ) : (
            <ul className={points}>
              {lines.map((line) => (
                <li className={point} key={line}>
                  {line}
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="grid gap-3">
          <h3 className={findingTitle}>Flags</h3>
          {flags.map((flag) => (
            <FlagCard
              key={flag.id}
              flag={flag}
              busyId={busyId}
              grouped
              onReview={onReview}
              onSave={onSave}
            />
          ))}
        </section>
      </div>
    </article>
  );
}

function NoteReview({ note, busyId, onSave, onApprove }) {
  const saved = carePoints(note).join("\n");
  const [text, setText] = useState(saved);

  useEffect(() => {
    setText(saved);
  }, [note.id, saved]);

  const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);
  const unchanged = lines.join("\n") === carePoints(note).join("\n");

  return (
    <article className={sheet}>
      <header className={sheetHead}>
        <div>
          <h2 className={cardTitle}>{note.residentName}</h2>
          <p className="text-soft">
            {note.when}
            {" · "}
            {note.approved ? "Approved" : note.sent ? "Sent for approval" : "Waiting on the note"}
          </p>
        </div>
        <button
          type="button"
          className={note.approved ? ghost : btn}
          disabled={!note.sent || busyId === note.id}
          onClick={() => onApprove(note.id, !note.approved)}
        >
          <Spin on={busyId === note.id} />
          {note.approved ? "Approved" : "Approve"}
        </button>
      </header>
      <div className="mt-4 grid gap-3">
        <section className={finding}>
          <h3 className={findingTitle}>Written by the carer</h3>
          <p className="mt-2 whitespace-pre-wrap rounded-xl border border-line bg-white px-3.5 py-3 leading-relaxed text-body">
            {note.jot || "Nothing written yet."}
          </p>
        </section>
        <section className={finding}>
          <h3 className={findingTitle}>Care notes</h3>
          <textarea
            className={`${area} mt-2 min-h-0`}
            rows={Math.max(4, text.split("\n").length)}
            aria-label={`Care notes for ${note.residentName}`}
            value={text}
            onChange={(event) => setText(event.target.value)}
          />
          <div className={actions}>
            <button
              type="button"
              className={ghost}
              disabled={!note.sent || !lines.length || unchanged || busyId === note.id}
              onClick={() => onSave(note.id, lines)}
            >
              <Spin on={busyId === note.id} />
              Save edits
            </button>
          </div>
        </section>
      </div>
    </article>
  );
}

function ResidentHandover({ person, tasks, flags, incidents, advice, busyId, onSave, onAdvise }) {
  return (
    <article className={sheet}>
      <h2 className={cardTitle}>{person.name}</h2>
      {tasks.length === 0 && <p className={`${settled} mt-3`}>Save an action from a flag or an incident first.</p>}
      <div className="mt-3 grid gap-3">
        {tasks.map((item) => (
          <ActionHandover
            key={item.id}
            action={item}
            source={sourceText(item, flags, incidents)}
            advice={advice[item.id] || ""}
            busyId={busyId}
            onAdvise={onAdvise}
            onSave={onSave}
          />
        ))}
      </div>
    </article>
  );
}

function ActionHandover({ action, source, advice, busyId, onAdvise, onSave }) {
  const [text, setText] = useState(action.handover || "");

  useEffect(() => {
    setText(advice || action.handover || "");
  }, [action.id, action.handover, advice]);

  const saving = busyId === `handover-${action.id}`;
  const advising = busyId === `advice-${action.id}`;
  const dirty = text.trim() !== (action.handover || "").trim();

  return (
    <section className="rounded-xl border border-line bg-white px-3.5 py-3">
      {source && <p className={`${kick} break-words`}>{source}</p>}
      <ActionPoints points={actionPoints(action)} />
      <div className={actions}>
        <button type="button" className={ghost} disabled={advising} onClick={() => onAdvise(action.id)}>
          <Spin on={advising} />
          {advising ? "Generating…" : "Generate handover"}
        </button>
      </div>
      <label className={fieldLabel} htmlFor={`handover-${action.id}`}>
        Handover
      </label>
      <textarea
        id={`handover-${action.id}`}
        className={area}
        placeholder="Advice for this resident."
        value={text}
        onChange={(event) => setText(event.target.value)}
      />
      <div className={actions}>
        <button
          type="button"
          className={btn}
          disabled={!dirty || !text.trim() || saving}
          onClick={() => onSave(action.id, text.trim())}
        >
          <Spin on={saving} />
          Save
        </button>
      </div>
    </section>
  );
}

function ActionSource({ item, flags, incidents, notes, name }) {
  const flag = (flags || []).find((entry) => entry.id === item.flagId);
  const note = noteLabel((notes || []).find((entry) => entry.id === flag?.noteId));
  const linked = sourceText(item, flags, incidents);
  if (!linked && !note) return null;
  return (
    <>
      {note && <p className={`${meta} break-words`}>From the note · {note}</p>}
      {linked && <p className={`${sourceQuote} mt-1 break-words`}>{withoutName(linked, name)}</p>}
    </>
  );
}

function SourceCard({ kind, label, title, detail, from, selected = false, onSelect }) {
  const incident = kind === "Incident";
  return (
    <article
      className={`${record} min-w-0 break-words text-left ${
        selected ? "!shadow-[0_10px_28px_rgba(7,25,44,0.04),inset_0_0_0_2px_#0f7a84]" : ""
      } ${onSelect ? "cursor-pointer" : ""}`}
      onClick={onSelect}
      onKeyDown={
        onSelect
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onSelect();
              }
            }
          : undefined
      }
      role={onSelect ? "button" : undefined}
      tabIndex={onSelect ? 0 : undefined}
      aria-pressed={onSelect ? selected : undefined}
    >
      <p className={incident ? incidentKick : kick}>
        {kind} · {label}
      </p>
      <h3 className="mt-1 font-semibold break-words">{title}</h3>
      {detail && <p className={`${meta} mt-1 break-words`}>{detail}</p>}
      {from && <p className="mt-2 break-words text-[0.92rem]">From the note · {from}</p>}
    </article>
  );
}

function GenerateActions({ count, busy, onCreate }) {
  return (
    <div className="mt-3 flex justify-end">
      <button type="button" className={btn} disabled={!count || busy} onClick={onCreate}>
        <Spin on={busy} />
        {busy ? "Generating…" : count ? `Generate actions · ${count}` : "Generate actions"}
      </button>
    </div>
  );
}

function ActionPoints({ points }) {
  if (!points.length) return null;
  return (
    <ul className="mt-2 grid gap-1.5">
      {points.map((point, index) => (
        <li key={`${index}-${point}`} className="flex gap-2.5 break-words">
          <span className="mt-[0.55rem] size-1.5 shrink-0 rounded-full bg-teal" aria-hidden="true" />
          <span>{point}</span>
        </li>
      ))}
    </ul>
  );
}

function ActionDraft({ item, source, note, busy, onSave }) {
  const [editing, setEditing] = useState(false);
  const [draftPoints, setDraftPoints] = useState(actionPoints(item).join("\n"));
  const fieldId = item.flagId || item.incidentId;

  useEffect(() => {
    if (editing) return;
    setDraftPoints(actionPoints(item).join("\n"));
  }, [editing, item]);

  const points = draftPoints
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  return (
    <article className={`${record} min-w-0`}>
      {note && <p className={`${meta} break-words`}>From the note · {note}</p>}
      {source && <p className={`${kick} mt-1 break-words`}>{source}</p>}
      {editing ? (
        <>
          <label className={fieldLabel} htmlFor={`action-points-${fieldId}`}>
            Points
          </label>
          <textarea
            id={`action-points-${fieldId}`}
            className={area}
            value={draftPoints}
            onChange={(event) => setDraftPoints(event.target.value)}
          />
        </>
      ) : (
        <ActionPoints points={points} />
      )}
      <div className={actions}>
        {!editing && (
          <button type="button" className={ghost} onClick={() => setEditing(true)}>
            Edit
          </button>
        )}
        {editing && (
          <button
            type="button"
            className={ghost}
            onClick={() => {
              setDraftPoints(actionPoints(item).join("\n"));
              setEditing(false);
            }}
          >
            Cancel
          </button>
        )}
        <button
          type="button"
          className={btn}
          disabled={busy || !points.length}
          onClick={() => {
            onSave({ ...item, title: points[0], detail: points.join("\n"), points });
            setEditing(false);
          }}
        >
          <Spin on={busy} />
          Save
        </button>
      </div>
    </article>
  );
}

function FlagCard({ flag, busyId, grouped = false, onReview, onSave }) {
  const warm = (editingKind) => editingKind === "falls" || editingKind === "safeguarding";
  const [editing, setEditing] = useState(false);
  const [kind, setKind] = useState(flag.kind);
  const [title, setTitle] = useState(flag.title);
  const [why, setWhy] = useState(flag.why);
  const saving = busyId === `flag-edit-${flag.id}`;

  useEffect(() => {
    if (editing) return;
    setKind(flag.kind);
    setTitle(flag.title);
    setWhy(flag.why);
  }, [editing, flag.kind, flag.title, flag.why]);

  const shownKind = editing ? kind : flag.kind;

  return (
    <article
      className={`${grouped ? record : sheet} border-l-4 ${warm(shownKind) ? "border-l-clay" : "border-l-teal"}`}
    >
      <header className="mb-2 flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          {editing ? (
            <label className={labelClass} htmlFor={`flag-kind-${flag.id}`}>
              Kind
              <select
                id={`flag-kind-${flag.id}`}
                className={`${field} mt-1.5 normal-case`}
                value={kind}
                onChange={(event) => setKind(event.target.value)}
              >
                {FLAG_KINDS.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <p className={warm(shownKind) ? "text-[0.72rem] font-semibold tracking-[0.14em] text-clay uppercase" : kick}>
              Flag · {labelFor(FLAG_KINDS, shownKind)}
            </p>
          )}
          {editing ? (
            <label className={labelClass} htmlFor={`flag-title-${flag.id}`}>
              Title
              <input
                id={`flag-title-${flag.id}`}
                className={`${field} mt-1.5`}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
            </label>
          ) : (
            <h3 className={recordTitle}>{flag.title}</h3>
          )}
          {!grouped && <p className={meta}>{flag.residentName}</p>}
        </div>
        <span className={tag(flag.status !== "open")}>{flag.status === "open" ? "Open" : "Reviewed"}</span>
      </header>
      <div className="mt-3.5 rounded-xl border border-[#e3f1f0] bg-white px-3.5 py-3">
        <span className="block text-[0.82rem] font-semibold tracking-[0.04em] text-deep uppercase">
          Why this flag
        </span>
        {editing ? (
          <textarea
            className={`${area} mt-2`}
            aria-label={`Why this flag for ${flag.residentName}`}
            value={why}
            onChange={(event) => setWhy(event.target.value)}
          />
        ) : (
          <p className="mt-1 text-ink">{flag.why}</p>
        )}
      </div>
      {flag.sourceQuote && <p className={sourceQuote}>From the note: “{flag.sourceQuote}”</p>}
      <div className={actions}>
        {editing ? (
          <>
            <button
              type="button"
              className={btn}
              disabled={!title.trim() || !why.trim() || saving}
              onClick={async () => {
                const saved = await onSave(flag.id, {
                  kind,
                  title: title.trim(),
                  why: why.trim(),
                });
                if (saved) setEditing(false);
              }}
            >
              <Spin on={saving} />
              Save
            </button>
            <button type="button" className={ghost} disabled={saving} onClick={() => setEditing(false)}>
              Cancel
            </button>
          </>
        ) : (
          <>
            <button type="button" className={ghost} onClick={() => setEditing(true)}>
              Edit
            </button>
            <button
              type="button"
              className={flag.status === "reviewed" ? ghost : btn}
              disabled={busyId === flag.id}
              onClick={() => onReview(flag.id, flag.status === "reviewed" ? "open" : "reviewed")}
            >
              <Spin on={busyId === flag.id} />
              {flag.status === "reviewed" ? "Reviewed" : "Mark reviewed"}
            </button>
          </>
        )}
      </div>
    </article>
  );
}

function IncidentCard({ incident, busyId, onTrack }) {
  return (
    <article className={`${sheet} border-l-4 border-l-navy`}>
      <header className="mb-2 flex items-start justify-between gap-4">
        <div>
          <p className={incidentKick}>Incident · {labelFor(INCIDENT_KINDS, incident.kind)}</p>
          <h3 className={recordTitle}>{incident.residentName}</h3>
          <p className={meta}>
            {incident.when} · {incident.reportedBy}
          </p>
        </div>
        <label className="block min-w-[140px] text-xs font-semibold tracking-[0.08em] text-soft uppercase max-lg:min-w-0">
          <span className="inline-flex items-center gap-2">
            Status
            <Spin on={busyId === incident.id} className="size-3.5 text-teal" />
          </span>
          <select
            className={`${field} mt-1.5 normal-case`}
            value={incident.status}
            disabled={busyId === incident.id}
            aria-label={`Status for ${incident.residentName}`}
            onChange={(event) => onTrack(incident.id, event.target.value)}
          >
            {INCIDENT_STATUS.map((status) => (
              <option key={status.id} value={status.id}>
                {status.label}
              </option>
            ))}
          </select>
        </label>
      </header>
      <p className="mt-2">{incident.summary}</p>
    </article>
  );
}
