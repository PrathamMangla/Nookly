import { Link } from "react-router-dom";
import { useInView } from "../hooks/useInView.js";
import { btn, kicker } from "../ui.js";

const SAMPLES = [
  {
    label: "Support worker",
    name: "Priya Shah",
    text: "Notes, the handover, and incidents for the people on her list.",
    writing: true,
    body: (
      <>
        <p className="mb-2 font-serif text-[1.02rem] text-soft after:ml-[3px] after:inline-block after:h-[0.95em] after:w-px after:animate-caret after:bg-teal after:align-text-bottom after:content-['']">
          Half his porridge, no lunch. Unsteady twice.
        </p>
        <p className="text-[0.95rem]">Arthur ate about half of his porridge and declined lunch.</p>
      </>
    ),
  },
  {
    label: "Shift lead",
    name: "Hannah Brooks",
    text: "Flags, actions, and the handover she publishes.",
    body: (
      <p className="text-[0.95rem]">
        Stay with Arthur if he gets up. Offer supper in his room. His daughter may call after 7.
      </p>
    ),
  },
  {
    label: "Manager",
    name: "Daniel Adeyemi",
    text: "Incidents, trends, and how the service is set up.",
    body: (
      <>
        <p className="flex justify-between gap-3 py-1.5">
          <span>Arthur Bennett</span>
          <em className="text-[0.85rem] font-semibold text-deep not-italic">Unsteady</em>
        </p>
        <p className="flex justify-between gap-3 py-1.5">
          <span>Nora Shah</span>
          <em className="text-[0.85rem] font-semibold text-deep not-italic">Broken sleep</em>
        </p>
      </>
    ),
  },
  {
    label: "System admin",
    name: "Alex Morgan",
    text: "Users, roles, and the audit trail. Nothing clinical.",
    body: <p className="text-[0.95rem]">Priya · Hannah · Daniel · Alex</p>,
  },
];

export default function Preview() {
  const [ref, shown] = useInView(0.12);

  return (
    <section id="roles" className="scroll-mt-[76px] px-0 pt-[88px] pb-10" ref={ref}>
      <div className="mx-auto w-[min(1120px,calc(100%-48px))] max-sm:w-[min(1120px,calc(100%-32px))]">
        <header className="mb-8 max-w-[40rem]">
          <p className={kicker}>The screens</p>
          <h2 className="text-[clamp(2rem,3.4vw,2.8rem)] leading-[1.12] font-semibold tracking-[-0.035em]">
            Four people, one morning
          </h2>
          <p className="mt-[18px] max-w-[52ch] text-soft">
            A sample of Riverside, not the working screens. Sign in to open a dashboard. These notes
            are illustrative, not a live record.
          </p>
        </header>

        <div className="grid gap-[18px] md:grid-cols-2">
          {SAMPLES.map((sample, index) => (
            <article
              className={`flex min-h-full flex-col items-start gap-2.5 rounded-[18px] border border-line bg-paper p-[22px] ${shown ? "animate-rise" : "opacity-0"}`}
              style={{ animationDelay: shown ? `${index * 0.08}s` : undefined }}
              key={sample.name}
            >
              <p className="text-[0.78rem] font-semibold tracking-[0.08em] text-teal uppercase">{sample.label}</p>
              <h3 className="text-[1.45rem] font-semibold tracking-[-0.03em]">{sample.name}</h3>
              <p className="text-soft">{sample.text}</p>
              <div className="mt-1.5 mb-2 w-full rounded-[14px] border border-line bg-white p-3.5">{sample.body}</div>
            </article>
          ))}
        </div>
        <p className="mt-[22px]">
          <Link className={btn} to="/login">
            Sign in
          </Link>
        </p>
      </div>
    </section>
  );
}
