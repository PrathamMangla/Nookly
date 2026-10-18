import { useInView } from "../hooks/useInView.js";
import { kicker } from "../ui.js";

const STEPS = [0, 1, 2, 3];

export default function HowItWorks() {
  const [ref, shown] = useInView(0.12);

  return (
    <section id="how" className="scroll-mt-[76px] bg-paper pt-[108px] pb-24 max-sm:py-[72px]" ref={ref}>
      <div className="mx-auto grid w-[min(1120px,calc(100%-48px))] items-start gap-9 max-sm:w-[min(1120px,calc(100%-32px))] lg:grid-cols-[minmax(240px,340px)_minmax(0,1fr)] lg:gap-[72px]">
        <div className="lg:sticky lg:top-[104px]">
          <p className={kicker}>How it works</p>
          <h2 className="max-w-[16ch] text-[clamp(2rem,3.4vw,2.8rem)] leading-[1.12] font-semibold tracking-[-0.035em] lg:max-w-[12ch]">
            One note. Then the handover.
          </h2>
          <p className="mt-[18px] max-w-[32ch] text-soft">
            Priya writes a few words. AI turns them into the care note and keeps her original.
            Hannah reviews the flags and publishes the handover. Daniel sees incidents, trends,
            and how the service is set up.
          </p>
        </div>

        <ol>
          {STEPS.map((index) => (
            <Step key={index} index={index} shown={shown} last={index === 3}>
              {index === 0 && <WorkerStep />}
              {index === 1 && <LeadStep />}
              {index === 2 && <ManagerStep />}
              {index === 3 && <AdminStep />}
            </Step>
          ))}
        </ol>
      </div>
    </section>
  );
}

function Step({ index, shown, last, children }) {
  const delay = ["delay-0", "delay-75", "delay-150", "delay-300"][index];
  return (
    <li
      className={`relative grid grid-cols-[22px_1fr] gap-[18px] pb-[42px] transition duration-700 last:pb-0 ${delay} ${shown ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}
    >
      {!last && <span className="absolute top-[26px] bottom-0 left-1 w-px bg-[rgba(15,122,132,0.28)]" />}
      <span className="mt-[7px] size-[9px] rounded-full bg-teal shadow-[0_0_0_5px_rgba(15,122,132,0.12)]" />
      <div>{children}</div>
    </li>
  );
}

function Mini({ children }) {
  return (
    <div className="mt-4 max-w-[460px] rounded-[14px] border border-line bg-white px-4 py-3.5 shadow-[0_10px_30px_rgba(7,25,44,0.04)]" aria-hidden="true">
      {children}
    </div>
  );
}

function WorkerStep() {
  return (
    <>
      <p className="text-[0.78rem] font-semibold tracking-[0.08em] text-teal uppercase">01 · Support worker</p>
      <h3 className="mt-1.5 mb-2 text-[1.45rem] font-semibold tracking-[-0.03em]">Priya jots it. AI writes it up.</h3>
      <p className="max-w-[52ch] text-soft">A few words from the visit become a clear care note. She sends it on.</p>
      <Mini>
        <p className="mb-2 text-xs font-semibold tracking-[0.08em] text-soft uppercase">Helen Crowe</p>
        <p className="mb-2.5 text-[0.92rem] text-soft">
          “Lounge with her frame, most of lunch. Left knee ached, then fine once she sat.”
        </p>
        <p className="font-serif text-[1.02rem] leading-normal text-ink">
          Helen walked to the lounge with her frame and ate most of her lunch. A new ache in her left
          knee settled once she sat down.
        </p>
      </Mini>
    </>
  );
}

function LeadStep() {
  return (
    <>
      <p className="text-[0.78rem] font-semibold tracking-[0.08em] text-teal uppercase">02 · Shift lead</p>
      <h3 className="mt-1.5 mb-2 text-[1.45rem] font-semibold tracking-[-0.03em]">
        Hannah reviews the flags and publishes the handover.
      </h3>
      <p className="max-w-[52ch] text-soft">
        She assigns the actions, approves the notes, and writes advice for each resident.
      </p>
      <Mini>
        <p className="mb-2 text-xs font-semibold tracking-[0.08em] text-soft uppercase">Handover · Helen</p>
        <p className="font-serif text-[1.02rem] leading-normal text-ink">
          Knee ache settled. Paracetamol at 14:00, as charted. No pain at 17:30. Crossword after tea.
          Evening medication due at 18:00.
        </p>
      </Mini>
    </>
  );
}

function ManagerStep() {
  return (
    <>
      <p className="text-[0.78rem] font-semibold tracking-[0.08em] text-teal uppercase">03 · Manager</p>
      <h3 className="mt-1.5 mb-2 text-[1.45rem] font-semibold tracking-[-0.03em]">Daniel sees the service, not every note.</h3>
      <p className="max-w-[52ch] text-soft">Incidents, the flags for residents, and how Riverside is set up.</p>
      <Mini>
        <Row hot name="Arthur Bennett" note="Unsteady, eating less" />
        <Row hot name="Nora Shah" note="Broken sleep" />
        <Row name="Helen and James" note="Settled" />
      </Mini>
    </>
  );
}

function AdminStep() {
  return (
    <>
      <p className="text-[0.78rem] font-semibold tracking-[0.08em] text-teal uppercase">04 · System admin</p>
      <h3 className="mt-1.5 mb-2 text-[1.45rem] font-semibold tracking-[-0.03em]">Alex can see who uses it.</h3>
      <p className="max-w-[52ch] text-soft">
        Four logins. Support worker, shift lead, manager, system admin. No care decisions on this screen.
      </p>
      <Mini>
        <Role name="Priya Shah" role="Support worker" first />
        <Role name="Hannah Brooks" role="Shift lead" />
        <Role name="Daniel Adeyemi" role="Manager" />
        <Role name="Alex Morgan" role="System admin" />
      </Mini>
    </>
  );
}

function Row({ name, note, hot }) {
  return (
    <div className={`flex justify-between gap-4 rounded-lg px-2 py-2 text-[0.95rem] ${hot ? "bg-mint" : ""}`}>
      <span>{name}</span>
      <em className={`text-[0.85rem] not-italic whitespace-nowrap ${hot ? "font-semibold text-teal" : "font-medium text-soft"}`}>
        {note}
      </em>
    </div>
  );
}

function Role({ name, role, first }) {
  return (
    <div className={`flex items-baseline justify-between gap-4 py-2.5 text-[0.95rem] ${first ? "" : "border-t border-line"}`}>
      <span className="font-semibold">{name}</span>
      <em className="text-[0.85rem] font-semibold text-teal not-italic whitespace-nowrap">{role}</em>
    </div>
  );
}
