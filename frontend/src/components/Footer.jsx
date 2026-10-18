import { logoMark } from "../ui.js";

export default function Footer() {
  return (
    <footer className="border-t border-white/10 bg-navy pt-[22px] pb-8 text-white/70">
      <div className="mx-auto flex w-[min(1120px,calc(100%-48px))] flex-wrap items-center justify-between gap-x-7 gap-y-[18px] max-sm:w-[min(1120px,calc(100%-32px))]">
        <a className="inline-flex items-center gap-2.5 text-xl font-bold tracking-[-0.04em] text-white" href="#top">
          <i className={logoMark} aria-hidden="true" />
          Nookly
        </a>
        <p className="flex items-center text-[0.95rem] font-semibold tracking-[-0.02em]">
          <span className="text-white/85">Predict.</span>
          <span className="mx-[0.85em] h-[0.85em] w-px bg-current opacity-35" aria-hidden="true" />
          <span className="text-white/85">Prevent.</span>
          <span className="mx-[0.85em] h-[0.85em] w-px bg-current opacity-35" aria-hidden="true" />
          <span className="text-teal">Empower.</span>
        </p>
        <p className="w-full text-[0.88rem] text-white/50">An early preview for conversation. Not a live care record.</p>
      </div>
    </footer>
  );
}
