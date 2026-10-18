import { useOutletContext } from "react-router-dom";
import { byStatus, FLAG_KINDS, INCIDENT_KINDS, INCIDENT_STATUS, labelFor, residentNotes } from "../care.js";
import { DeskIntro, Stats, Status } from "../components/DashBits.jsx";
import { Spin } from "../components/Spinner.jsx";
import { ROLES } from "../roles.js";
import { field, kick, meta, record, recordHead, recordTitle, sectionLabel, settled } from "../ui.js";

const role = ROLES[2];
const TEAL = "#0f7a84";

export default function ManagerPage() {
  const { residents, notes, flags, incidents, actions, error, busyId, trackIncident } = useOutletContext();
  const ready = Boolean(residents && notes && flags && incidents && actions);
  const openActions = actions?.filter((item) => item.status === "open") || [];
  const actionParts = ready
    ? residents.map((person) => ({
        id: person.id,
        label: shortName(person.name),
        value: openActions.filter((item) => item.residentId === person.id).length,
      }))
    : [];
  const noteParts = ready
    ? residents.map((person) => ({
        id: person.id,
        label: shortName(person.name),
        value: residentNotes(person.id, notes).length,
      }))
    : [];
  const flagParts = FLAG_KINDS.map((kind) => ({
    ...kind,
    value: flags?.filter((flag) => flag.kind === kind.id).length || 0,
  }));
  const incidentParts = INCIDENT_KINDS.map((kind) => ({
    ...kind,
    value: incidents?.filter((item) => item.kind === kind.id).length || 0,
  }));

  return (
    <>
      <DeskIntro role={role} />
      <Status error={error} ready={ready} />
      {ready && (
        <>
          <Stats
            items={[
              { label: "Open actions", value: openActions.length },
              { label: "Total notes", value: notes?.length || 0 },
              { label: "Flags", value: flags.length },
              { label: "Incidents", value: incidents.length },
            ]}
          />
          <div className="mb-6 grid items-start gap-3.5 lg:grid-cols-2">
            <ChartCard title="Open actions" caption="Open actions for each person.">
              <ColumnChart parts={actionParts} color={TEAL} empty="No open actions." />
            </ChartCard>
            <ChartCard title="Total notes" caption="Notes logged for each person.">
              <ColumnChart parts={noteParts} color={TEAL} empty="No notes yet." />
            </ChartCard>
            <ChartCard title="Flags" caption="Flags raised from the notes, by kind.">
              <ColumnChart parts={flagParts} color={TEAL} empty="No flags yet." />
            </ChartCard>
            <ChartCard title="Incidents" caption="Incidents logged, by kind.">
              <ColumnChart parts={incidentParts} color={TEAL} empty="No incidents yet." />
            </ChartCard>
          </div>
          <section>
            <h2 className={sectionLabel}>Incidents</h2>
            {incidents.length === 0 && <p className={settled}>No incidents logged yet.</p>}
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
                  <label className="block min-w-[140px] text-xs font-semibold tracking-[0.08em] text-soft uppercase max-lg:w-full max-lg:min-w-0">
                    <span className="inline-flex items-center gap-2">
                      Status
                      <Spin on={busyId === item.id} className="size-3.5 text-teal" />
                    </span>
                    <select
                      className={`${field} mt-1.5 normal-case`}
                      value={item.status}
                      disabled={busyId === item.id}
                      onChange={(event) => trackIncident(item.id, event.target.value)}
                    >
                      {INCIDENT_STATUS.map((status) => (
                        <option key={status.id} value={status.id}>
                          {status.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </header>
                <p className="mt-2">{item.summary}</p>
              </article>
            ))}
          </section>
        </>
      )}
    </>
  );
}

function ChartCard({ title, caption, children }) {
  return (
    <section className={record}>
      <h2 className={recordTitle}>{title}</h2>
      <p className={`${meta} mt-1`}>{caption}</p>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function ColumnChart({ parts, color, empty }) {
  if (!parts.length || parts.every((part) => part.value === 0)) return <p className={meta}>{empty}</p>;
  const max = Math.max(1, ...parts.map((part) => part.value));
  const width = Math.max(320, parts.length * 92);
  const height = 180;
  const left = 28;
  const bottom = 36;
  const top = 16;
  const plot = height - top - bottom;
  const slot = (width - left) / parts.length;
  const summary = parts.map((part) => `${part.label} ${part.value}`).join(", ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img" aria-label={summary}>
      {[0, max].filter((tick, index, list) => list.indexOf(tick) === index).map((tick) => {
        const y = top + plot - (tick / max) * plot;
        return (
          <g key={tick}>
            <line x1={left} x2={width - 8} y1={y} y2={y} stroke="#e4ecec" />
            <text x={left - 6} y={y + 4} textAnchor="end" fill="#4a5d70" fontSize="11">
              {tick}
            </text>
          </g>
        );
      })}
      {parts.map((part, index) => {
        const h = (part.value / max) * plot;
        const x = left + index * slot + slot / 2 - 14;
        return (
          <g key={part.id}>
            <rect x={x} y={top + plot - h} width="28" height={Math.max(h, part.value ? 2 : 0)} rx="4" fill={color} />
            {part.value > 0 && (
              <text x={x + 14} y={top + plot - h - 4} textAnchor="middle" fill="#102033" fontSize="11">
                {part.value}
              </text>
            )}
            <text x={x + 14} y={height - 12} textAnchor="middle" fill="#4a5d70" fontSize="11">
              {part.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function shortName(name) {
  const first = name.split(" ")[0];
  return first.length > 12 ? `${first.slice(0, 11)}…` : first;
}
