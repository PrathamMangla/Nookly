import { useOutletContext } from "react-router-dom";
import { SettingsForm, Status } from "../components/DashBits.jsx";
import { ACCESS, ROLES } from "../roles.js";
import { meta, notice, sectionLabel } from "../ui.js";

const role = ROLES[3];

export default function AdminPage() {
  const { users, audit, settings, error, busyId, saveSetting } = useOutletContext();
  const ready = Boolean(users && audit && settings);
  const system = settings?.filter((item) => item.group === "system") || [];

  return (
    <>
      <header className="mb-4">
        <p className="mb-1.5 text-xs font-semibold tracking-[0.16em] text-teal uppercase">{role.label}</p>
        <h1 className="text-[1.7rem] font-semibold leading-[1.15] tracking-[-0.04em]">{role.name}</h1>
        <p className="mt-2 max-w-[62ch] text-soft">{role.scope}</p>
      </header>
      <Status error={error} ready={ready} />
      {ready && (
        <>
          <p className={notice}>
            No care decisions on this screen. Notes, flags, and incidents stay with the people who
            provide care.
          </p>
          <section>
            <h2 className={sectionLabel}>Users</h2>
            <ul>
              {users.map((user, index) => (
                <li
                  className={`grid items-baseline gap-3 py-3.5 md:grid-cols-[1.15fr_0.9fr_1.5fr_auto] ${index ? "border-t border-line" : ""}`}
                  key={user.id}
                >
                  <strong className="font-semibold tracking-[-0.02em]">{user.name}</strong>
                  <span className="font-semibold">{user.roleLabel}</span>
                  <span className="text-soft">{user.does}</span>
                  <span className="text-[0.85rem] text-deep">{user.status}</span>
                </li>
              ))}
            </ul>
          </section>
          <section>
            <h2 className={sectionLabel}>Roles and permissions</h2>
            <div className="grid gap-3 md:grid-cols-2">
              {ACCESS.map((item) => (
                <article className="rounded-2xl border border-line bg-white px-[18px] py-4" key={item.id}>
                  <h3 className="text-xl font-semibold tracking-[-0.03em]">{item.label}</h3>
                  <p className={meta}>{item.line}</p>
                  <h4 className="mt-3 text-sm font-semibold">Can</h4>
                  <ul>
                    {item.can.map((line) => (
                      <li
                        className="relative py-0.5 pl-3.5 text-body before:absolute before:top-[0.65em] before:left-0 before:size-1.5 before:rounded-full before:bg-teal"
                        key={line}
                      >
                        {line}
                      </li>
                    ))}
                  </ul>
                  <h4 className="mt-3 text-sm font-semibold">Does not</h4>
                  <ul>
                    {item.cannot.map((line) => (
                      <li
                        className="relative py-0.5 pl-3.5 text-body before:absolute before:top-[0.65em] before:left-0 before:size-1.5 before:rounded-full before:bg-[#c4b2a8]"
                        key={line}
                      >
                        {line}
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </section>
          <section>
            <h2 className={sectionLabel}>Settings</h2>
            <SettingsForm
              items={system}
              group="system"
              busyId={busyId}
              onSave={saveSetting}
              locked={["care-lock"]}
            />
          </section>
          <section>
            <h2 className={sectionLabel}>Audit trail</h2>
            <p className={meta}>Who did what. The text of a care note is not stored here.</p>
            <ul>
              {audit.map((row, index) => (
                <li
                  className={`grid items-baseline gap-3 py-3 md:grid-cols-[130px_160px_1.1fr_1.3fr] ${index ? "border-t border-line" : ""}`}
                  key={row.id}
                >
                  <span className="text-soft">{row.at}</span>
                  <strong className="font-semibold">{row.actor}</strong>
                  <span className="text-soft">{row.action}</span>
                  <span className="text-soft">{row.subject}</span>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </>
  );
}
