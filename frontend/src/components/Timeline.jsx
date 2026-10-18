import { carePoints, FLAG_KINDS, labelFor } from "../care.js";
import { meta, record, recordHead, recordTitle, settled, sourceQuote, stack } from "../ui.js";

export default function Timeline({ residents, flags, actions }) {
  const approved = residents.filter((person) => person.approved && carePoints(person).length);

  if (!approved.length) {
    return (
      <p className={settled}>
        Nothing on the timeline yet. Approved care notes, their flags, and outstanding actions show
        here.
      </p>
    );
  }

  return (
    <div className={stack}>
      {approved.map((person) => {
        const personFlags = flags.filter((flag) => flag.residentId === person.id);
        const openActions = actions.filter(
          (item) => item.residentId === person.id && item.status === "open"
        );
        return (
          <article className={record} key={person.id}>
            <header className={recordHead}>
              <div>
                <h3 className={recordTitle}>{person.name}</h3>
              </div>
            </header>
            <ol className="mt-3 grid gap-2.5">
              {carePoints(person).map((point) => (
                <li key={point} className="border-l-[3px] border-teal py-1 pl-3">
                  <span className="block text-xs font-semibold tracking-[0.08em] text-deep uppercase">
                    Care note
                  </span>
                  <p>{point}</p>
                </li>
              ))}
              {personFlags.map((flag) => (
                <li key={flag.id} className="border-l-[3px] border-teal py-1 pl-3">
                  <span className="block text-xs font-semibold tracking-[0.08em] text-deep uppercase">
                    Flag · {labelFor(FLAG_KINDS, flag.kind)}
                  </span>
                  <p>{flag.title}</p>
                  <p className={meta}>{flag.why}</p>
                  {flag.sourceQuote && <p className={sourceQuote}>From the note: “{flag.sourceQuote}”</p>}
                </li>
              ))}
              {openActions.map((item) => (
                <li key={item.id} className="border-l-[3px] border-teal py-1 pl-3">
                  <span className="block text-xs font-semibold tracking-[0.08em] text-deep uppercase">
                    Outstanding action
                  </span>
                  <p>{item.title}</p>
                </li>
              ))}
            </ol>
          </article>
        );
      })}
    </div>
  );
}
