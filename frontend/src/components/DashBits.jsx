import { useState } from "react";
import { Spinner, Spin } from "./Spinner.jsx";
import { field, ghost, kicker, tag } from "../ui.js";

export function Status({ error, ready }) {
  if (error) return <p className="mb-4 text-soft">{error}</p>;
  if (!ready) {
    return (
      <div className="flex min-h-56 items-center justify-center" role="status" aria-live="polite">
        <Spinner />
        <span className="sr-only">Loading the shift.</span>
      </div>
    );
  }
  return null;
}

export function DeskIntro({ role }) {
  return (
    <header className="mb-4">
      <p className={`${kicker} mb-1.5`}>{role.label}</p>
      <h1 className="text-[1.7rem] font-semibold leading-[1.15] tracking-[-0.04em]">{role.name}</h1>
      <p className="mt-2 max-w-[62ch] text-soft">{role.scope}</p>
    </header>
  );
}

export function Stats({ items }) {
  return (
    <ul className="mb-4 grid grid-cols-2 overflow-hidden rounded-2xl border border-line bg-white shadow-[0_10px_28px_rgba(7,25,44,0.04)] lg:grid-cols-4">
      {items.map((item) => (
        <li
          className="px-4 pb-3 pt-3.5 max-lg:nth-[n+3]:border-t max-lg:nth-[n+3]:border-line max-lg:even:border-l max-lg:even:border-line lg:border-l lg:border-line lg:first:border-l-0"
          key={item.label}
        >
          <b className="block text-[1.7rem] font-semibold leading-none tracking-[-0.04em] tabular-nums">
            {item.value}
          </b>
          <span className="text-[0.88rem] text-soft">{item.label}</span>
        </li>
      ))}
    </ul>
  );
}

export function Tabs({ tabs, current, onChange, label }) {
  return (
    <div
      className="mb-4 flex w-fit max-w-full gap-0.5 overflow-x-auto rounded-full bg-[#e7eeee] p-1"
      role="tablist"
      aria-label={label}
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={current === tab.id}
          className="rounded-full px-3.5 py-2 font-semibold whitespace-nowrap text-soft aria-selected:bg-white aria-selected:text-ink aria-selected:shadow-[0_1px_2px_rgba(16,32,51,0.08)]"
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export function Chips({ tags }) {
  if (!tags?.length) return null;
  return (
    <span className="mt-2 flex flex-wrap gap-1.5">
      {tags.map((item) => (
        <span
          key={item}
          className="rounded-full bg-mint px-2 py-0.5 text-[0.72rem] font-semibold tracking-[0.04em] text-deep uppercase"
        >
          {item}
        </span>
      ))}
    </span>
  );
}

export function SettingsForm({ items, group, busyId, onSave, locked = [] }) {
  const [drafts, setDrafts] = useState({});

  return (
    <div>
      {items.map((item) => {
        const lockedRow = locked.includes(item.id);
        const value = drafts[item.id] ?? item.value;
        const dirty = value.trim() !== item.value.trim();
        return (
          <div
            className="grid items-start gap-3 border-t border-line py-3.5 lg:grid-cols-[minmax(160px,220px)_1fr_auto]"
            key={item.id}
          >
            <div>
              <strong className="font-semibold">{item.label}</strong>
              <p className="mt-1 text-[0.88rem] text-soft">{item.hint}</p>
            </div>
            {lockedRow ? (
              <p className="rounded-xl border border-line bg-white px-3.5 py-3 text-body">{item.value}</p>
            ) : (
              <textarea
                className={`${field} min-h-[72px] resize-y`}
                rows={2}
                aria-label={item.label}
                value={value}
                onChange={(event) =>
                  setDrafts((current) => ({ ...current, [item.id]: event.target.value }))
                }
              />
            )}
            {lockedRow ? (
              <span className={tag(true)}>Fixed</span>
            ) : (
              <button
                type="button"
                className={ghost}
                disabled={!dirty || !value.trim() || busyId === item.id}
                onClick={async () => {
                  const saved = await onSave(group, item.id, value.trim());
                  if (!saved) return;
                  setDrafts((current) => {
                    const next = { ...current };
                    delete next[item.id];
                    return next;
                  });
                }}
              >
                <Spin on={busyId === item.id} />
                Save
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function SectionTitle({ children }) {
  return <h2 className="mb-2.5 mt-[18px] text-xl font-semibold tracking-[-0.03em]">{children}</h2>;
}
