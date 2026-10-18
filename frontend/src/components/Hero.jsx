const POINTS = [
  ["AI-powered insights", "Predict risk. Prevent crisis. Improve lives."],
  ["Person-centred care", "Empowering care teams to make better decisions."],
  ["Better outcomes", "Data-driven insights for proactive, informed care."],
  ["Ethical & explainable AI", "Transparent AI you can trust and rely on."],
];

const DELAYS = ["delay-75", "delay-150", "delay-300", "delay-500"];

export default function Hero() {
  return (
    <section
      className="relative grid min-h-[calc(100svh-68px)] overflow-hidden bg-white before:absolute before:top-0 before:bottom-0 before:left-0 before:z-[3] before:w-1 before:bg-teal max-[980px]:min-h-0 max-[980px]:grid-cols-1 min-[981px]:grid-cols-[1.15fr_0.9fr]"
      id="top"
    >
      <div className="relative z-[1] flex items-center px-[clamp(28px,5vw,80px)] py-[clamp(48px,7vw,96px)] min-[981px]:pr-[88px] max-[980px]:px-7 max-[980px]:pt-14 max-[980px]:pb-10">
        <div className="max-w-[620px]">
          <p className="mb-[18px] animate-rise text-[0.78rem] font-semibold tracking-[0.16em] text-ink uppercase [animation-delay:0.05s]">
            Building the future of
          </p>
          <h1 className="animate-rise text-[clamp(2.7rem,12vw,3.6rem)] leading-[0.92] font-bold tracking-[-0.045em] text-navy [animation-delay:0.14s] sm:text-[clamp(3.3rem,6.4vw,5.5rem)]">
            <span className="block text-teal">Predictive care</span>
            <span className="block">with AI</span>
          </h1>
          <p className="mt-7 max-w-[46ch] animate-rise text-[1.05rem] leading-[1.65] text-body [animation-delay:0.24s]">
            Nookly is an AI-powered Predictive Care Intelligence platform that turns
            fragmented data into early insights, enables proactive interventions, and
            improves outcomes in health & social care.
          </p>
          <p className="mt-8 flex animate-rise flex-wrap items-center font-semibold tracking-[-0.02em] text-navy [animation-delay:0.34s]">
            <span>Predict.</span>
            <span className="mx-[0.85em] h-[0.85em] w-px bg-current opacity-35" aria-hidden="true" />
            <span>Prevent.</span>
            <span className="mx-[0.85em] h-[0.85em] w-px bg-current opacity-35" aria-hidden="true" />
            <span className="text-teal">Empower.</span>
          </p>
        </div>
      </div>
      <aside
        className="relative z-[2] flex items-center bg-navy text-white max-[980px]:px-6 max-[980px]:pt-9 max-[980px]:pb-12 min-[981px]:-ml-16 min-[981px]:py-[72px] min-[981px]:pr-14 min-[981px]:pl-[108px] min-[981px]:[clip-path:polygon(64px_0,100%_0,100%_100%,0_100%)]"
        aria-label="What Nookly stands for"
      >
        <ul>
          {POINTS.map(([title, text], index) => (
            <li
              className={`animate-rise border-t border-[rgba(142,240,234,0.28)] py-[22px] first:border-t-0 first:pt-0 last:pb-0 ${DELAYS[index]}`}
              key={title}
            >
              <h2 className="mb-1.5 text-[0.78rem] font-semibold tracking-[0.12em] text-aqua uppercase">{title}</h2>
              <p className="max-w-[28ch] text-[1.05rem] leading-snug text-white/85">{text}</p>
            </li>
          ))}
        </ul>
      </aside>
    </section>
  );
}
