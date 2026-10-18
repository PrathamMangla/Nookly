import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import {
  byRecent,
  carePoints,
  FLAG_KINDS,
  INCIDENT_KINDS,
  labelFor,
  localWhen,
  residentNotes,
} from "../care.js";
import { DeskIntro, Stats, Status, Tabs } from "../components/DashBits.jsx";
import { Spin } from "../components/Spinner.jsx";
import { ROLES } from "../roles.js";
import {
  actions,
  area,
  btn,
  cardTitle,
  emptyLine,
  field,
  fieldLabel,
  finding,
  findingTitle,
  findings,
  ghost,
  kick,
  meta,
  noteDesk,
  point,
  points,
  sectionLabel,
  settled,
  sheet,
  sheetHead,
  sourceLink,
  sourceQuote,
  tone,
} from "../ui.js";

const role = ROLES[0];
const TABS = [
  { id: "notes", label: "Notes" },
  { id: "incidents", label: "Incidents" },
  { id: "actions", label: "Actions" },
  { id: "handover", label: "Handovers" },
];

export default function WorkerPage() {
  const {
    residents,
    notes,
    flags,
    incidents,
    actions: shiftActions,
    shift,
    error,
    busyId,
    send,
    draft,
    logIncident,
    addResident,
    completeAction,
  } = useOutletContext();
  const [tab, setTab] = useState("notes");
  const [selected, setSelected] = useState("");
  const [kind, setKind] = useState("near_miss");
  const [summary, setSummary] = useState("");
  const person =
    residents?.find((item) => item.id === selected) ||
    residents?.find((item) => !item.sent) ||
    residents?.[0];
  const [jot, setJot] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    setJot("");
  }, [person?.id]);

  const ready = Boolean(residents && notes && incidents && shiftActions && shift);
  const openActions = shiftActions?.filter((item) => item.status === "open") || [];
  const openIncidents = incidents?.filter((item) => item.status !== "closed") || [];
  const personNotes = person ? residentNotes(person.id, notes) : [];
  const personIncidents = person ? incidents?.filter((item) => item.residentId === person.id) || [] : [];

  return (
    <>
      <DeskIntro role={role} />
      <Status error={error} ready={ready} />
      {ready && (
        <>
          <Stats
            items={[
              { label: "Assigned", value: residents.length },
              { label: "Notes to send", value: notes.filter((item) => item.dayNote.trim() && !item.sent).length },
              { label: "Open actions", value: openActions.length },
              { label: "Incidents open", value: openIncidents.length },
            ]}
          />
          <Tabs tabs={TABS} current={tab} onChange={setTab} label="Support worker" />
          {tab === "notes" && (
            <div className={noteDesk}>
              <ResidentPicker
                residents={residents}
                notes={notes}
                person={person}
                adding={adding}
                onSelect={setSelected}
                onToggleAdd={() => setAdding((open) => !open)}
              />
              {(adding || residents.length === 0) && (
                <AddPerson
                  busyId={busyId}
                  onCancel={residents.length ? () => setAdding(false) : undefined}
                  onAdd={async (body) => {
                    const saved = await addResident(body);
                    if (saved) {
                      setSelected(saved.id);
                      setAdding(false);
                    }
                    return saved;
                  }}
                />
              )}
              {person ? (
                <article className={sheet} key={person.id}>
                  <header className={sheetHead}>
                    <div>
                      <h2 className={cardTitle}>{person.name}</h2>
                      <p className="text-soft">Age {person.age}</p>
                    </div>
                    <span className={tone(statusKind(person, notes))}>
                      <StatusIcon kind={statusKind(person, notes)} />
                      {statusLabel(person, notes)}
                    </span>
                  </header>
                  <label className={labelClass} htmlFor="jot">
                    {personNotes.length ? "Another note" : "Your note"}
                  </label>
                  <textarea
                    id="jot"
                    className={`${area} min-h-[168px] leading-[1.55]`}
                    placeholder="Write what happened, in your own words. You can log more than one note."
                    value={jot}
                    onChange={(event) => setJot(event.target.value)}
                  />
                  <div className={actions}>
                    <button
                      type="button"
                      className={btn}
                      disabled={!jot.trim() || busyId === `draft-${person.id}`}
                      onClick={async () => {
                        const saved = await draft(person.id, jot.trim());
                        if (saved) setJot("");
                      }}
                    >
                      <Spin on={busyId === `draft-${person.id}`} />
                      {busyId === `draft-${person.id}` ? "Reading the note…" : "Find care points"}
                    </button>
                  </div>
                </article>
              ) : (
                <p className={settled}>Add someone, then write what happened.</p>
              )}
              {person && personNotes.length === 0 && (
                <p className={settled}>No notes for {person.name} yet. Write one above, then log another whenever you need to.</p>
              )}
              {person &&
                personNotes.map((note, index) => (
                  <LoggedNote
                    key={note.id}
                    number={personNotes.length - index}
                    note={note}
                    flags={(flags || []).filter((flag) => flag.noteId === note.id)}
                    busyId={busyId}
                    onSend={send}
                  />
                ))}
            </div>
          )}
          {tab === "actions" && (
            <section className={noteDesk}>
              <NameTabs residents={residents} person={person} onSelect={setSelected} />
              {!person ? (
                <p className={settled}>No residents yet.</p>
              ) : (
                <article className={sheet}>
                  {byRecent(shiftActions.filter((action) => action.residentId === person.id)).length === 0 ? (
                    <p className="leading-relaxed">No actions yet for this resident.</p>
                  ) : (
                    <div className="grid gap-3">
                      {byRecent(shiftActions.filter((action) => action.residentId === person.id)).map((action) => (
                        <CareCard
                          key={action.id}
                          action={action}
                          flags={flags}
                          incidents={incidents}
                          notes={notes}
                          busyId={busyId}
                          onComplete={completeAction}
                        />
                      ))}
                    </div>
                  )}
                </article>
              )}
            </section>
          )}
          {tab === "handover" && (
            <section className={noteDesk}>
              <NameTabs residents={residents} person={person} onSelect={setSelected} />
              {!person ? (
                <p className={settled}>No residents yet.</p>
              ) : (
                <article className={sheet}>
                  {(shiftActions || []).filter(
                    (action) => action.residentId === person.id && String(action.handover || "").trim(),
                  ).length === 0 ? (
                    <p className="leading-relaxed">No handover yet for this resident.</p>
                  ) : (
                    <div className="grid gap-3">
                      {byRecent(
                        (shiftActions || []).filter(
                          (action) => action.residentId === person.id && String(action.handover || "").trim(),
                        ),
                      ).map((action) => (
                          <CareCard
                            key={action.id}
                            action={action}
                            flags={flags}
                            incidents={incidents}
                            notes={notes}
                            handover
                          />
                        ))}
                    </div>
                  )}
                </article>
              )}
            </section>
          )}
          {tab === "incidents" && (
            <div className={noteDesk}>
              <ResidentPicker
                residents={residents}
                notes={notes}
                person={person}
                adding={adding}
                onSelect={setSelected}
                onToggleAdd={() => setAdding((open) => !open)}
              />
              {(adding || residents.length === 0) && (
                <AddPerson
                  busyId={busyId}
                  onCancel={residents.length ? () => setAdding(false) : undefined}
                  onAdd={async (body) => {
                    const saved = await addResident(body);
                    if (saved) {
                      setSelected(saved.id);
                      setAdding(false);
                    }
                    return saved;
                  }}
                />
              )}
              {person ? (
                <form
                  className={sheet}
                  key={person.id}
                  onSubmit={async (event) => {
                    event.preventDefault();
                    const saved = await logIncident(person.id, kind, summary.trim());
                    if (saved) setSummary("");
                  }}
                >
                  <header className={sheetHead}>
                    <div>
                      <h2 className={cardTitle}>{person.name}</h2>
                      <p className="text-soft">Age {person.age}</p>
                    </div>
                    <span className={tone(personIncidents.length ? "ready" : "wait")}>
                      {personIncidents.length ? `${personIncidents.length} logged` : "No incidents"}
                    </span>
                  </header>
                  <label className={labelClass} htmlFor="incident-kind">
                    Kind
                  </label>
                  <select
                    id="incident-kind"
                    className={field}
                    value={kind}
                    onChange={(event) => setKind(event.target.value)}
                  >
                    {INCIDENT_KINDS.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                  <label className={labelClass} htmlFor="incident-summary">
                    {personIncidents.length ? "Another incident" : "Your incident"}
                  </label>
                  <textarea
                    id="incident-summary"
                    className={`${area} min-h-[168px] leading-[1.55]`}
                    placeholder="Write what happened, in your own words. You can log more than one incident."
                    value={summary}
                    onChange={(event) => setSummary(event.target.value)}
                  />
                  <div className={actions}>
                    <button
                      type="submit"
                      className={btn}
                      disabled={!summary.trim() || busyId === `incident-${person.id}`}
                    >
                      <Spin on={busyId === `incident-${person.id}`} />
                      Log incident
                    </button>
                  </div>
                </form>
              ) : (
                <p className={settled}>Add someone, then write what happened.</p>
              )}
              {person && personIncidents.length === 0 && (
                <p className={settled}>
                  No incidents for {person.name} yet. Write one above, then log another whenever you need to.
                </p>
              )}
              {person &&
                byRecent(personIncidents).map((item, index, list) => ({
                  ...item,
                  number: list.length - index,
                })).map((item) => (
                  <article className={sheet} key={item.id}>
                    <header className={sheetHead}>
                      <div>
                        <h2 className={cardTitle}>Incident {item.number}</h2>
                        <p className="text-soft">
                          {labelFor(INCIDENT_KINDS, item.kind)}
                          {localWhen(item.at) ? ` · ${localWhen(item.at)}` : ""}
                        </p>
                      </div>
                      <span className={tone(item.status === "closed" ? "approved" : "ready")}>
                        {item.status === "closed" ? "Closed" : item.status === "tracking" ? "Tracking" : "Open"}
                      </span>
                    </header>
                    <p className="mt-3 whitespace-pre-wrap leading-relaxed">{item.summary}</p>
                  </article>
                ))}
            </div>
          )}
        </>
      )}
    </>
  );
}

const labelClass = "mb-2 mt-3.5 block text-xs font-semibold tracking-[0.12em] text-soft uppercase";

function ResidentPicker({ residents, notes, person, adding, onSelect, onToggleAdd }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] items-stretch gap-2.5">
      {residents.length > 0 && (
        <ul className="contents">
          {byRecent(residents).map((item) => {
            const kindName = statusKind(item, notes);
            const pressed = person?.id === item.id;
            return (
              <li key={item.id} className="min-w-0">
                <button
                  type="button"
                  aria-pressed={pressed}
                  className="group grid h-full min-h-[120px] w-full grid-cols-[40px_minmax(0,1fr)] items-center gap-x-3 gap-y-2 rounded-xl border border-line bg-white px-4 py-3.5 text-left aria-pressed:border-[#b7e0de] aria-pressed:bg-mint"
                  onClick={() => onSelect(item.id)}
                >
                  <PersonIcon pressed={pressed} />
                  <span className="col-start-2 row-start-1 min-w-0">
                    <strong className="block truncate font-semibold tracking-[-0.02em]">{item.name}</strong>
                    {localWhen(item.at) && (
                      <span className="mt-0.5 block truncate text-sm font-normal text-soft">{localWhen(item.at)}</span>
                    )}
                  </span>
                  <em className={`${tone(kindName, pressed)} col-start-2 row-start-2 justify-self-start`}>
                    <StatusIcon kind={kindName} />
                    {statusLabel(item, notes)}
                  </em>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {residents.length > 0 && !adding && (
        <button
          type="button"
          className="flex h-full min-h-[120px] items-center justify-center gap-2 rounded-xl border border-dashed border-[rgba(16,32,51,0.22)] bg-white px-4 py-3.5 font-semibold text-deep"
          onClick={onToggleAdd}
        >
          <PlusIcon />
          Add a resident
        </button>
      )}
    </div>
  );
}

function AddPerson({ busyId, onAdd, onCancel }) {
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const ageNumber = Number(age);
  const ready = name.trim() && Number.isInteger(ageNumber) && ageNumber >= 0;

  return (
    <form
      className="grid items-end gap-3 rounded-2xl border border-line bg-white p-4 md:grid-cols-[1.5fr_0.45fr_auto]"
      onSubmit={async (event) => {
        event.preventDefault();
        const saved = await onAdd({
          name: name.trim(),
          room: "",
          age: ageNumber,
          tags: "",
        });
        if (!saved) return;
        setName("");
        setAge("");
      }}
    >
      <label className={fieldLabel} htmlFor="resident-name">
        Name
        <input
          id="resident-name"
          className={`${field} mt-1.5`}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </label>
      <label className={fieldLabel} htmlFor="resident-age">
        Age
        <input
          id="resident-age"
          className={`${field} mt-1.5`}
          inputMode="numeric"
          value={age}
          onChange={(event) => setAge(event.target.value)}
        />
      </label>
      <div className="flex flex-wrap gap-2">
        <button className={btn} type="submit" disabled={!ready || busyId === "resident-new"}>
          <Spin on={busyId === "resident-new"} />
          Add
        </button>
        {onCancel && (
          <button className={ghost} type="button" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

function PersonIcon({ pressed }) {
  return (
    <span
      className={`col-start-1 row-start-1 grid size-10 place-items-center rounded-xl text-deep ${pressed ? "bg-white" : "bg-mint"}`}
      aria-hidden="true"
    >
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="12" cy="8" r="3.2" />
        <path d="M5.5 19.2c1.2-3 3.5-4.4 6.5-4.4s5.3 1.4 6.5 4.4" strokeLinecap="round" />
      </svg>
    </span>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
    </svg>
  );
}

function StatusIcon({ kind }) {
  if (kind === "approved" || kind === "sent") {
    return (
      <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
        <path d="M5 12.5 9.2 17 19 7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (kind === "ready") {
    return (
      <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <circle cx="12" cy="12" r="8" />
        <path d="M12 8v4.5l3 2" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="12" cy="12" r="7" />
    </svg>
  );
}

function statusLabel(person, notes) {
  const mine = residentNotes(person.id, notes);
  const unsent = mine.filter((note) => !note.sent);
  if (!mine.length) return "No notes";
  if (unsent.length === 1) return "1 to send";
  if (unsent.length > 1) return `${unsent.length} to send`;
  if (mine.some((note) => !note.approved)) return "Sent";
  return "Approved";
}

function statusKind(person, notes) {
  const mine = residentNotes(person.id, notes);
  if (!mine.length) return "wait";
  if (mine.some((note) => !note.sent)) return "ready";
  if (mine.some((note) => !note.approved)) return "sent";
  return "approved";
}

function LoggedNote({ note, number, flags, busyId, onSend }) {
  const [quote, setQuote] = useState("");
  return (
    <article className={sheet}>
      <header className={sheetHead}>
        <div>
          <h2 className={cardTitle}>Note {number}</h2>
          <p className="text-soft">{localWhen(note.at)}</p>
        </div>
        <span className={tone(note.approved ? "approved" : note.sent ? "sent" : "ready")}>
          {note.approved ? "Approved" : note.sent ? "Sent" : "To send"}
        </span>
      </header>
      <p className="mt-3 whitespace-pre-wrap leading-relaxed">{note.jot}</p>
      <div className={findings}>
        <section className={finding}>
          <h3 className={findingTitle}>Care notes</h3>
          <ul className={points}>
            {carePoints(note).map((line) => (
              <li className={point} key={line}>
                {line}
              </li>
            ))}
          </ul>
        </section>
        <section className={finding}>
          <div className="flex items-baseline justify-between gap-3">
            <h3 className={findingTitle}>Suggested flags</h3>
            <p className="text-sm font-semibold text-ink">{flagCount(flags.length)}</p>
          </div>
          <PersonFlags flags={flags} onSource={setQuote} />
          {quote && <p className={sourceQuote}>In the note: “{quote}”</p>}
        </section>
      </div>
      {!note.sent && (
        <div className={actions}>
          <button type="button" className={btn} disabled={busyId === note.id} onClick={() => onSend(note.id, true)}>
            <Spin on={busyId === note.id} />
            Send for approval
          </button>
        </div>
      )}
    </article>
  );
}

function flagCount(count) {
  return count === 1 ? "1 flag" : `${count} flags`;
}

function SectionTime({ label, at }) {
  const when = localWhen(at);
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
      <p className={kick}>{label}</p>
      {when && <p className="text-sm text-soft">{when}</p>}
    </div>
  );
}

function NameTabs({ residents, person, onSelect }) {
  if (!residents?.length) return null;
  return (
    <div>
      <p className={fieldLabel}>Name</p>
      <div className="flex flex-wrap gap-2">
        {byRecent(residents).map((item) => {
          const chosen = item.id === person?.id;
          return (
            <button
              key={item.id}
              type="button"
              aria-pressed={chosen}
              className={chosen ? btn : ghost}
              onClick={() => onSelect(item.id)}
            >
              <span className="block text-left leading-tight">
                {item.name}
                {localWhen(item.at) && (
                  <span className={`mt-0.5 block text-xs font-normal ${chosen ? "text-white/80" : "text-soft"}`}>
                    {localWhen(item.at)}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CareCard({ action, flags, incidents, notes, handover = false, busyId, onComplete }) {
  const flag = (flags || []).find((entry) => entry.id === action.flagId);
  const incident = (incidents || []).find((entry) => entry.id === action.incidentId);
  const note = (notes || []).find((entry) => entry.id === flag?.noteId);
  const noteText = String(note?.jot || "").trim();
  const concern = flag
    ? `Flag · ${labelFor(FLAG_KINDS, flag.kind)} · ${flag.title}`
    : incident
      ? `Incident · ${labelFor(INCIDENT_KINDS, incident.kind)} · ${incident.summary}`
      : "";
  const detail = flag?.why || "";

  return (
    <section className="rounded-xl border border-line bg-white px-3.5 py-3">
      <div className="grid gap-3">
        <div>
          <SectionTime label="Note" at={note?.at} />
          <p className="mt-1 whitespace-pre-wrap leading-relaxed">{noteText || "No note is linked."}</p>
        </div>
        <div>
          <SectionTime label={incident && !flag ? "Incident" : "Flag"} at={flag?.at || incident?.at} />
          {concern && <p className="mt-1 font-semibold break-words">{concern}</p>}
          {detail && <p className={`${meta} mt-1 break-words`}>{detail}</p>}
        </div>
        <div>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className={kick}>Actions</p>
              {localWhen(action.at) && <p className="mt-1 text-sm text-soft">{localWhen(action.at)}</p>}
            </div>
            {onComplete && (
              <button
                type="button"
                className={`${action.status === "done" ? ghost : btn} shrink-0 whitespace-nowrap`}
                disabled={busyId === action.id}
                onClick={() => onComplete(action.id, action.status === "done" ? "open" : "done")}
              >
                <Spin on={busyId === action.id} />
                {action.status === "done" ? "Done" : "Mark done"}
              </button>
            )}
          </div>
          <ActionLines item={action} />
        </div>
        {handover && (
          <div>
            <SectionTime label="Handover" at={action.at} />
            <ActionLines item={{ detail: action.handover, title: "" }} />
          </div>
        )}
      </div>
    </section>
  );
}

function ActionLines({ item }) {
  const lines = String(item.detail || "")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  const title = String(item.title || "").trim();
  const shown = lines.length ? lines : [title].filter(Boolean);
  if (!shown.length) return null;
  return (
    <ul className="mt-2 grid gap-1.5">
      {shown.map((line) => (
        <li key={line} className="flex gap-2.5 break-words leading-relaxed">
          <span className="mt-[0.55rem] size-1.5 shrink-0 rounded-full bg-teal" aria-hidden="true" />
          <span>{line}</span>
        </li>
      ))}
    </ul>
  );
}

function PersonFlags({ flags, onSource }) {
  if (!flags.length) {
    return <p className={emptyLine}>Concerns from the note and the care notes show here.</p>;
  }
  return (
    <ul className={points}>
      {byRecent(flags).map((flag) => (
        <li className={point} key={flag.id}>
          <p className={kick}>{labelFor(FLAG_KINDS, flag.kind)}</p>
          <strong className="block font-semibold">{flag.title}</strong>
          {localWhen(flag.at) && <p className="mt-1 text-sm text-soft">{localWhen(flag.at)}</p>}
          <p className="mt-2">
            <span className={`${kick} block`}>Why</span>
            {flag.why}
          </p>
          {flag.sourceQuote && (
            <button type="button" className={sourceLink} onClick={() => onSource(flag.sourceQuote)}>
              Source: “{flag.sourceQuote}”
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}

