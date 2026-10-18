import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import {
  byStatus,
  carePoints,
  FLAG_KINDS,
  INCIDENT_KINDS,
  labelFor,
  residentSources,
  sourceText,
} from "../care.js";
import { DeskIntro, Stats, Status, Tabs } from "../components/DashBits.jsx";
import { Spin } from "../components/Spinner.jsx";
import Timeline from "../components/Timeline.jsx";
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
  record,
  recordHead,
  recordTitle,
  settled,
  sheet,
  sheetHead,
  sourceQuote,
  stack,
  tag,
} from "../ui.js";

const role = ROLES[1];
const TABS = [
  { id: "flags", label: "Flags" },
  { id: "actions", label: "Actions" },
  { id: "notes", label: "Approve" },
  { id: "handover", label: "Handover" },
  { id: "timeline", label: "Timeline" },
];
const labelClass = "mb-2 mt-3.5 block text-xs font-semibold tracking-[0.12em] text-soft uppercase";

export default function SeniorPage() {
  const {
    residents,
    flags,
    incidents,
    actions: shiftActions,
    shift,
    error,
    busyId,
    approve,
    savePoints,
    reviewFlag,
    assignAction,
    draftActions,
    completeAction,
    writeHandover,
    draftResidentHandover,
  } = useOutletContext();
  const [tab, setTab] = useState("flags");
  const [title, setTitle] = useState("");
  const [residentId, setResidentId] = useState("arthur");
  const [origin, setOrigin] = useState("");

  const ready = Boolean(residents && flags && incidents && shiftActions && shift);
  const openFlags = flags?.filter((item) => item.status === "open") || [];
  const waiting = residents?.filter((item) => item.sent && !item.approved) || [];
  const openActions = shiftActions?.filter((item) => item.status === "open") || [];
  const writtenHandovers = residents?.filter((person) => person.handover.trim()).length || 0;
  const actionResidentId = residents?.some((item) => item.id === residentId)
    ? residentId
    : residents?.[0]?.id || "";
  const actionResident = residents?.find((item) => item.id === actionResidentId);
  const actionSources = actionResident ? residentSources(actionResident.id, flags, incidents) : { flags: [], incidents: [] };
  const originChoices = [
    ...actionSources.flags.map((flag) => ({
      id: `flag:${flag.id}`,
      label: `Flag · ${labelFor(FLAG_KINDS, flag.kind)} · ${flag.title}`,
    })),
    ...actionSources.incidents.map((incident) => ({
      id: `incident:${incident.id}`,
      label: `Incident · ${labelFor(INCIDENT_KINDS, incident.kind)} · ${incident.summary}`,
    })),
  ];
  const originValue = originChoices.some((item) => item.id === origin) ? origin : originChoices[0]?.id || "";

  return (
    <>
      <DeskIntro role={role} />
      <Status error={error} ready={ready} />
      {ready && (
        <>
          <Stats
            items={[
              { label: "Flags to review", value: openFlags.length },
              { label: "Notes to approve", value: waiting.length },
              { label: "Open actions", value: openActions.length },
              { label: "Handovers", value: writtenHandovers },
            ]}
          />
          <Tabs tabs={TABS} current={tab} onChange={setTab} label="Shift lead" />
          {tab === "flags" && (
            <section className={stack}>
              <p className="rounded-xl bg-paper px-3.5 py-3 text-body">
                Review each flag. A flag explains the note. It is not a diagnosis or a decision.
              </p>
              {flags.length === 0 && (
                <p className={settled}>
                  No flags yet. They appear when a note mentions a fall, health, sleep, eating, or a
                  concern to review.
                </p>
              )}
              {flags.map((flag) => (
                <FlagCard key={flag.id} flag={flag} busyId={busyId} onReview={reviewFlag} />
              ))}
            </section>
          )}
          {tab === "notes" && (
            <section className={stack}>
              <p className="rounded-xl bg-paper px-3.5 py-3 text-body">
                Check the carer’s own words and the care notes. Edit them if you need to, then approve.
                Concerns from the note stay on Flags.
              </p>
              {residents.length === 0 && (
                <p className={settled}>No residents yet. Notes appear after the support worker writes them.</p>
              )}
              {residents.map((person) => (
                <NoteReview
                  key={person.id}
                  person={person}
                  flagCount={flags.filter((flag) => flag.residentId === person.id).length}
                  busyId={busyId}
                  onSave={savePoints}
                  onApprove={approve}
                />
              ))}
            </section>
          )}
          {tab === "timeline" && <Timeline residents={residents} flags={flags} actions={shiftActions} />}
          {tab === "actions" && (
            <section className={noteDesk}>
              {residents.length === 0 ? (
                <p className={settled}>Add a resident before assigning an action.</p>
              ) : (
                <form
                  className="grid items-end gap-3 rounded-2xl border border-line bg-white p-4 max-md:grid-cols-1 md:grid-cols-2 xl:grid-cols-[1fr_1.4fr_1fr_auto]"
                  onSubmit={async (event) => {
                    event.preventDefault();
                    const [kind, sourceId] = originValue.split(":");
                    const flag = actionSources.flags.find((item) => item.id === sourceId);
                    const incident = actionSources.incidents.find((item) => item.id === sourceId);
                    const saved = await assignAction({
                      residentId: actionResidentId,
                      title: title.trim(),
                      detail: flag?.why || incident?.summary || "Added from the communication book.",
                      flagId: kind === "flag" ? sourceId : "",
                      incidentId: kind === "incident" ? sourceId : "",
                    });
                    if (saved) setTitle("");
                  }}
                >
                  <div>
                    <label className={fieldLabel} htmlFor="action-person">
                      Resident
                    </label>
                    <select
                      id="action-person"
                      className={field}
                      value={actionResidentId}
                      onChange={(event) => setResidentId(event.target.value)}
                    >
                      {residents.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={fieldLabel} htmlFor="action-from">
                      From
                    </label>
                    <select
                      id="action-from"
                      className={field}
                      value={originValue}
                      disabled={!originChoices.length}
                      onChange={(event) => setOrigin(event.target.value)}
                    >
                      {!originChoices.length && <option value="">No flag or incident</option>}
                      {originChoices.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={fieldLabel} htmlFor="action-title">
                      Action
                    </label>
                    <input
                      id="action-title"
                      className={field}
                      value={title}
                      onChange={(event) => setTitle(event.target.value)}
                    />
                  </div>
                  <button
                    className={btn}
                    type="submit"
                    disabled={!title.trim() || !originValue || busyId === "action-new"}
                  >
                    <Spin on={busyId === "action-new"} />
                    Assign
                  </button>
                </form>
              )}
              {actionResident && (
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    className={ghost}
                    disabled={!originChoices.length || busyId === `actions-${actionResidentId}`}
                    onClick={() => draftActions(actionResidentId)}
                  >
                    <Spin on={busyId === `actions-${actionResidentId}`} />
                    {busyId === `actions-${actionResidentId}` ? "Writing…" : "Draft with OpenAI"}
                  </button>
                  <p className={meta}>
                    {originChoices.length
                      ? `Writes one action for each flag and incident for ${actionResident.name}.`
                      : `${actionResident.name} needs a flag or an incident before an action can be written.`}
                  </p>
                </div>
              )}
              <div className={stack}>
                {shiftActions.length === 0 && <p className={settled}>No actions assigned yet.</p>}
                {byStatus(shiftActions).map((item) => (
                  <article className={record} key={item.id}>
                    <header className={recordHead}>
                      <div>
                        <h3 className={recordTitle}>{item.title}</h3>
                        <p className={meta}>
                          {item.residentName}
                          {item.source === "openai" ? " · Drafted" : ""}
                        </p>
                        <ActionSource item={item} flags={flags} incidents={incidents} />
                      </div>
                      <button
                        type="button"
                        className={item.status === "done" ? ghost : btn}
                        disabled={busyId === item.id}
                        onClick={() => completeAction(item.id, item.status === "done" ? "open" : "done")}
                      >
                        <Spin on={busyId === item.id} />
                        {item.status === "done" ? "Done" : "Mark done"}
                      </button>
                    </header>
                    {item.detail && <p className="mt-2">{item.detail}</p>}
                  </article>
                ))}
              </div>
            </section>
          )}
          {tab === "handover" && (
            <section className={stack}>
              <p className="rounded-xl bg-paper px-3.5 py-3 text-body">
                Each handover is written from that resident’s flags and incidents.
              </p>
              {residents.length === 0 && (
                <p className={settled}>No residents yet. A handover appears after a flag or an incident.</p>
              )}
              {residents.map((person) => (
                <ResidentHandover
                  key={person.id}
                  person={person}
                  flags={flags}
                  incidents={incidents}
                  busyId={busyId}
                  onSave={writeHandover}
                  onDraft={draftResidentHandover}
                />
              ))}
            </section>
          )}
        </>
      )}
    </>
  );
}

function NoteReview({ person, flagCount, busyId, onSave, onApprove }) {
  const saved = carePoints(person).join("\n");
  const [text, setText] = useState(saved);

  useEffect(() => {
    setText(saved);
  }, [person.id, saved]);

  const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);
  const unchanged = lines.join("\n") === carePoints(person).join("\n");

  return (
    <article className={sheet}>
      <header className={sheetHead}>
        <div>
          <h2 className={cardTitle}>{person.name}</h2>
          <p className="text-soft">
            {person.approved ? "Approved" : person.sent ? "Sent for approval" : "Waiting on the note"}
          </p>
        </div>
        <button
          type="button"
          className={person.approved ? ghost : btn}
          disabled={!person.sent || busyId === person.id}
          onClick={() => onApprove(person.id, !person.approved)}
        >
          <Spin on={busyId === person.id} />
          {person.approved ? "Approved" : "Approve"}
        </button>
      </header>
      <div className="mt-4 grid gap-3">
        <section className={finding}>
          <h3 className={findingTitle}>Written by the carer</h3>
          <p className="mt-2 whitespace-pre-wrap rounded-xl border border-line bg-white px-3.5 py-3 leading-relaxed text-body">
            {person.jot || "Nothing written yet."}
          </p>
        </section>
        <section className={finding}>
          <h3 className={findingTitle}>Care notes</h3>
          <textarea
            className={`${area} mt-2 min-h-0`}
            rows={Math.max(4, text.split("\n").length)}
            aria-label={`Care notes for ${person.name}`}
            value={text}
            onChange={(event) => setText(event.target.value)}
          />
          <div className={actions}>
            <button
              type="button"
              className={ghost}
              disabled={!person.sent || !lines.length || unchanged || busyId === person.id}
              onClick={() => onSave(person.id, lines)}
            >
              <Spin on={busyId === person.id} />
              Save edits
            </button>
          </div>
        </section>
      </div>
      {flagCount > 0 && (
        <p className={`${meta} mt-3`}>
          {flagCount} {flagCount === 1 ? "flag" : "flags"} from this note, on the Flags tab.
        </p>
      )}
    </article>
  );
}

function ResidentHandover({ person, flags, incidents, busyId, onSave, onDraft }) {
  const [text, setText] = useState(person.handover || "");
  const sources = residentSources(person.id, flags, incidents);
  const canDraft = sources.flags.length + sources.incidents.length > 0;

  useEffect(() => {
    setText(person.handover || "");
  }, [person.id, person.handover]);

  const dirty = text.trim() !== (person.handover || "").trim();
  const busy = busyId === `handover-${person.id}`;

  return (
    <article className={sheet}>
      <header className={sheetHead}>
        <div>
          <h2 className={cardTitle}>{person.name}</h2>
        </div>
      </header>
      <SourceList flags={sources.flags} incidents={sources.incidents} />
      <label className={labelClass} htmlFor={`handover-${person.id}`}>
        Handover for {person.name}
      </label>
      <textarea
        id={`handover-${person.id}`}
        className={area}
        value={text}
        onChange={(event) => setText(event.target.value)}
      />
      <div className={actions}>
        <button
          type="button"
          className={ghost}
          disabled={!dirty || !text.trim() || busy}
          onClick={() => onSave(person.id, text.trim())}
        >
          <Spin on={busy} />
          Save
        </button>
        <button type="button" className={ghost} disabled={!canDraft || busy} onClick={() => onDraft(person.id)}>
          <Spin on={busy} />
          {busy ? "Writing…" : "Draft with OpenAI"}
        </button>
      </div>
    </article>
  );
}

function ActionSource({ item, flags, incidents }) {
  const linked = sourceText(item, flags, incidents);
  if (linked) return <p className={`${sourceQuote} mt-2`}>{linked}</p>;
  const sources = residentSources(item.residentId, flags, incidents);
  if (!sources.flags.length && !sources.incidents.length) return null;
  return <SourceList flags={sources.flags} incidents={sources.incidents} />;
}

function SourceList({ flags, incidents }) {
  if (!flags.length && !incidents.length) {
    return <p className={`${meta} mt-3`}>No flag or incident yet.</p>;
  }
  return (
    <ul className="mt-3 grid gap-2">
      {flags.map((flag) => (
        <li className="rounded-xl border border-line bg-white px-3.5 py-2.5" key={flag.id}>
          <p className={kick}>Flag · {labelFor(FLAG_KINDS, flag.kind)}</p>
          <p className="mt-1 font-semibold">{flag.title}</p>
          <p className={`${meta} mt-1`}>{flag.why}</p>
        </li>
      ))}
      {incidents.map((incident) => (
        <li className="rounded-xl border border-line bg-white px-3.5 py-2.5" key={incident.id}>
          <p className={kick}>Incident · {labelFor(INCIDENT_KINDS, incident.kind)}</p>
          <p className="mt-1">{incident.summary}</p>
        </li>
      ))}
    </ul>
  );
}

function FlagCard({ flag, busyId, onReview }) {
  const warm = flag.kind === "falls" || flag.kind === "safeguarding";

  return (
    <article className={`${sheet} border-l-4 ${warm ? "border-l-clay" : "border-l-teal"}`}>
      <header className="mb-2 flex items-start justify-between gap-4">
        <div>
          <p className={warm ? "text-[0.72rem] font-semibold tracking-[0.14em] text-clay uppercase" : kick}>
            {labelFor(FLAG_KINDS, flag.kind)}
          </p>
          <h3 className={recordTitle}>{flag.title}</h3>
          <p className={meta}>
            {flag.residentName}
          </p>
        </div>
        <span className={tag(flag.status !== "open")}>{flag.status === "open" ? "Open" : "Reviewed"}</span>
      </header>
      <div className="mt-3.5 rounded-xl border border-[#e3f1f0] bg-white px-3.5 py-3">
        <span className="block text-[0.82rem] font-semibold tracking-[0.04em] text-deep uppercase">
          Why this flag
        </span>
        <p className="mt-1 text-ink">{flag.why}</p>
      </div>
      {flag.sourceQuote && <p className={sourceQuote}>From the note: “{flag.sourceQuote}”</p>}
      <div className={actions}>
        <button
          type="button"
          className={flag.status === "reviewed" ? ghost : btn}
          disabled={busyId === flag.id}
          onClick={() => onReview(flag.id, flag.status === "reviewed" ? "open" : "reviewed")}
        >
          <Spin on={busyId === flag.id} />
          {flag.status === "reviewed" ? "Reviewed" : "Mark reviewed"}
        </button>
      </div>
    </article>
  );
}
