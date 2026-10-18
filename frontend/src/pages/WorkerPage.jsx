import { useEffect, useRef, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { byStatus, carePoints, FLAG_KINDS, INCIDENT_KINDS, labelFor, residentSources, sourceText } from "../care.js";
import { DeskIntro, Stats, Status, Tabs } from "../components/DashBits.jsx";
import { Spin } from "../components/Spinner.jsx";
import Timeline from "../components/Timeline.jsx";
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
  prose,
  record,
  recordHead,
  recordTitle,
  sectionLabel,
  settled,
  sheet,
  sheetHead,
  sourceLink,
  sourceQuote,
  tag,
  tone,
} from "../ui.js";

const role = ROLES[0];
const TABS = [
  { id: "notes", label: "Notes" },
  { id: "timeline", label: "Timeline" },
  { id: "handover", label: "Handover" },
  { id: "incidents", label: "Incidents" },
];

export default function WorkerPage() {
  const {
    residents,
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
  const [quote, setQuote] = useState("");
  const [adding, setAdding] = useState(false);
  const noteRef = useRef(null);

  useEffect(() => {
    if (person) setJot(person.jot);
    setQuote("");
  }, [person?.id, person?.jot]);

  const ready = Boolean(residents && incidents && shiftActions && shift);
  const openActions = shiftActions?.filter((item) => item.status === "open") || [];
  const openIncidents = incidents?.filter((item) => item.status !== "closed") || [];

  return (
    <>
      <DeskIntro role={role} />
      <Status error={error} ready={ready} />
      {ready && (
        <>
          <Stats
            items={[
              { label: "Assigned", value: residents.length },
              { label: "Notes to send", value: residents.filter((item) => item.dayNote.trim() && !item.sent).length },
              { label: "Open actions", value: openActions.length },
              { label: "Incidents open", value: openIncidents.length },
            ]}
          />
          <Tabs tabs={TABS} current={tab} onChange={setTab} label="Support worker" />
          {tab === "notes" && (
            <div className={noteDesk}>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] items-stretch gap-2.5">
                {residents.length > 0 && (
                  <ul className="contents">
                    {residents.map((item) => {
                      const kindName = statusKind(item);
                      const pressed = person?.id === item.id;
                      return (
                        <li key={item.id} className="min-w-0">
                          <button
                            type="button"
                            aria-pressed={pressed}
                            className="group grid h-full min-h-[120px] w-full grid-cols-[40px_minmax(0,1fr)] items-center gap-x-3 gap-y-2 rounded-xl border border-line bg-white px-4 py-3.5 text-left aria-pressed:border-[#b7e0de] aria-pressed:bg-mint"
                            onClick={() => setSelected(item.id)}
                          >
                            <PersonIcon pressed={pressed} />
                            <span className="col-start-2 row-start-1 min-w-0">
                              <strong className="block truncate font-semibold tracking-[-0.02em]">{item.name}</strong>
                            </span>
                            <em className={`${tone(kindName, pressed)} col-start-2 row-start-2 justify-self-start`}>
                              <StatusIcon kind={kindName} />
                              {statusLabel(item)}
                            </em>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
                <button
                  type="button"
                  className="flex h-full min-h-[120px] items-center justify-center gap-2 rounded-xl border border-dashed border-[rgba(16,32,51,0.22)] bg-white px-4 py-3.5 font-semibold text-deep"
                  aria-expanded={adding || residents.length === 0}
                  onClick={() => setAdding((open) => !open)}
                >
                  <PlusIcon />
                  {adding || residents.length === 0 ? "Close" : "Add a resident"}
                </button>
              </div>
              {(adding || residents.length === 0) && (
                <AddPerson
                  busyId={busyId}
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
                    <span className={tone(statusKind(person))}>
                      <StatusIcon kind={statusKind(person)} />
                      {statusLabel(person)}
                    </span>
                  </header>
                  <label className={labelClass} htmlFor="jot">
                    Your note
                  </label>
                  <textarea
                    id="jot"
                    ref={noteRef}
                    className={`${area} min-h-[168px] leading-[1.55]`}
                    placeholder="Write what happened, in your own words."
                    value={jot}
                    onChange={(event) => setJot(event.target.value)}
                  />
                  <div className={actions}>
                    <button
                      type="button"
                      className={carePoints(person).length ? ghost : btn}
                      disabled={!jot.trim() || busyId === `draft-${person.id}`}
                      onClick={() => draft(person.id, jot.trim())}
                    >
                      <Spin on={busyId === `draft-${person.id}`} />
                      {busyId === `draft-${person.id}` ? "Reading the note…" : "Find care points"}
                    </button>
                    {person.sent ? (
                      <button
                        type="button"
                        className={ghost}
                        disabled={busyId === person.id}
                        onClick={() => send(person.id, false)}
                      >
                        <Spin on={busyId === person.id} />
                        Sent · take back
                      </button>
                    ) : (
                      <button
                        type="button"
                        className={btn}
                        disabled={
                          busyId === person.id || busyId === `draft-${person.id}` || !person.dayNote.trim()
                        }
                        onClick={() => send(person.id, true)}
                      >
                        <Spin on={busyId === person.id} />
                        Send for approval
                      </button>
                    )}
                  </div>
                  <div className={findings}>
                    <section className={finding}>
                      <h3 className={findingTitle}>Care notes</h3>
                      {carePoints(person).length === 0 ? (
                        <p className={emptyLine}>Found in the note you write.</p>
                      ) : (
                        <ul className={points}>
                          {carePoints(person).map((line) => (
                            <li className={point} key={line}>
                              {line}
                            </li>
                          ))}
                        </ul>
                      )}
                    </section>
                    <section className={finding}>
                      <h3 className={findingTitle}>Suggested flags</h3>
                      <PersonFlags
                        flags={(flags || []).filter((flag) => flag.residentId === person.id)}
                        onSource={(source) => showSource(noteRef.current, source, setQuote)}
                      />
                      {quote && <p className={sourceQuote}>In the note: “{quote}”</p>}
                    </section>
                  </div>
                </article>
              ) : (
                <p className={settled}>Add someone, then write what happened on the shift.</p>
              )}
            </div>
          )}
          {tab === "timeline" && <Timeline residents={residents} flags={flags || []} actions={shiftActions} />}
          {tab === "handover" && (
            <section className={noteDesk}>
              {residents.length === 0 && <p className={settled}>No residents on this shift yet.</p>}
              {residents.map((person) => {
                const sources = residentSources(person.id, flags, incidents);
                return (
                  <article className={sheet} key={person.id}>
                    <h2 className={cardTitle}>{person.name}</h2>
                    <ul className="mt-3 grid gap-2">
                      {sources.flags.map((flag) => (
                        <li className="rounded-xl border border-line bg-white px-3.5 py-2.5" key={flag.id}>
                          <p className={kick}>Flag · {labelFor(FLAG_KINDS, flag.kind)}</p>
                          <p className="mt-1 font-semibold">{flag.title}</p>
                        </li>
                      ))}
                      {sources.incidents.map((incident) => (
                        <li className="rounded-xl border border-line bg-white px-3.5 py-2.5" key={incident.id}>
                          <p className={kick}>Incident · {labelFor(INCIDENT_KINDS, incident.kind)}</p>
                          <p className="mt-1">{incident.summary}</p>
                        </li>
                      ))}
                    </ul>
                    <p className={`${prose} mt-3`}>
                      {person.handover.trim() || "The shift lead has not written this handover yet."}
                    </p>
                  </article>
                );
              })}
              <h2 className={sectionLabel}>Communication book</h2>
              {shiftActions.length === 0 && <p className={settled}>Nothing in the book for this shift.</p>}
              {byStatus(shiftActions).map((item) => (
                <article className={record} key={item.id}>
                  <header className={recordHead}>
                    <div>
                      <h3 className={recordTitle}>{item.title}</h3>
                      <p className={meta}>{item.residentName}</p>
                      {sourceText(item, flags, incidents) && (
                        <p className={`${meta} mt-1`}>{sourceText(item, flags, incidents)}</p>
                      )}
                    </div>
                    <span className={tag(item.status !== "open")}>{item.status === "open" ? "Open" : "Done"}</span>
                  </header>
                  {item.detail && <p className="mt-2">{item.detail}</p>}
                </article>
              ))}
            </section>
          )}
          {tab === "incidents" && !person && (
            <p className={settled}>Add a resident on the Notes tab, then log what happened.</p>
          )}
          {tab === "incidents" && person && (
            <section className="grid items-start gap-[22px] lg:grid-cols-[1.25fr_0.75fr]">
              <div>
                <h2 className={sectionLabel}>Assigned residents</h2>
                {incidents.length === 0 && <p className={settled}>No incidents logged.</p>}
                {byStatus(incidents).map((item) => (
                  <article className={`${record} mb-3`} key={item.id}>
                    <header className={recordHead}>
                      <div>
                        <p className={kick}>{labelFor(INCIDENT_KINDS, item.kind)}</p>
                        <h3 className={recordTitle}>{item.residentName}</h3>
                        <p className={meta}>
                          {item.when} · {item.reportedBy}
                        </p>
                      </div>
                      <span className={tag(item.status === "closed")}>
                        {item.status === "closed" ? "Closed" : item.status === "tracking" ? "Tracking" : "Open"}
                      </span>
                    </header>
                    <p className="mt-2">{item.summary}</p>
                  </article>
                ))}
              </div>
              <form
                className={sheet}
                onSubmit={async (event) => {
                  event.preventDefault();
                  const saved = await logIncident(person.id, kind, summary.trim());
                  if (saved) setSummary("");
                }}
              >
                <h2 className={cardTitle}>Log an incident</h2>
                <p className={meta}>{person.name}</p>
                <label className={labelClass} htmlFor="incident-person">
                  Resident
                </label>
                <select
                  id="incident-person"
                  className={field}
                  value={person.id}
                  onChange={(event) => setSelected(event.target.value)}
                >
                  {residents.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
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
                  What happened
                </label>
                <textarea
                  id="incident-summary"
                  className={area}
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
            </section>
          )}
        </>
      )}
    </>
  );
}

const labelClass = "mb-2 mt-3.5 block text-xs font-semibold tracking-[0.12em] text-soft uppercase";

function AddPerson({ busyId, onAdd }) {
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
      <button className={btn} type="submit" disabled={!ready || busyId === "resident-new"}>
        <Spin on={busyId === "resident-new"} />
        Add
      </button>
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

function statusLabel(person) {
  if (person.approved) return "Approved";
  if (person.sent) return "Sent";
  if (person.dayNote.trim()) return "To send";
  return "No note";
}

function statusKind(person) {
  if (person.approved) return "approved";
  if (person.sent) return "sent";
  if (person.dayNote.trim()) return "ready";
  return "wait";
}

function PersonFlags({ flags, onSource }) {
  if (!flags.length) {
    return <p className={emptyLine}>Only when the note supports them.</p>;
  }
  return (
    <ul className={points}>
      {flags.map((flag) => (
        <li className={point} key={flag.id}>
          <p className={kick}>{labelFor(FLAG_KINDS, flag.kind)}</p>
          <strong className="block font-semibold">{flag.title}</strong>
          <p>{flag.why}</p>
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

function showSource(fieldNode, source, setQuote) {
  setQuote(source);
  if (!fieldNode || !source) return;
  const index = fieldNode.value.toLowerCase().indexOf(source.toLowerCase());
  if (index < 0) return;
  fieldNode.focus();
  fieldNode.setSelectionRange(index, index + source.length);
  fieldNode.scrollIntoView({ block: "center" });
}
