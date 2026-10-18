export const kicker = "text-xs font-semibold uppercase tracking-[0.16em] text-teal";
export const btn =
  "inline-flex min-h-[42px] items-center justify-center gap-2 rounded-full bg-teal px-4 py-2.5 text-[0.92rem] font-semibold text-white transition hover:-translate-y-px hover:bg-deep disabled:translate-y-0 disabled:cursor-default disabled:opacity-55";
export const ghost =
  "inline-flex min-h-[42px] items-center justify-center gap-2 rounded-full bg-transparent px-4 py-2.5 text-[0.92rem] font-semibold text-ink shadow-[inset_0_0_0_1px_rgba(16,32,51,0.16)] transition hover:-translate-y-px hover:bg-white disabled:translate-y-0 disabled:cursor-default disabled:opacity-55";
export const field =
  "w-full min-h-11 rounded-xl border border-line bg-white px-3 py-2.5 font-[inherit] text-ink";
export const area =
  "w-full min-h-[110px] resize-y rounded-xl border border-line bg-white px-3.5 py-3 font-[inherit] text-ink";
export const label =
  "mb-2 mt-3.5 block text-xs font-semibold uppercase tracking-[0.12em] text-soft";
export const fieldLabel =
  "mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-soft";
export const sheet = "rounded-[20px] bg-white p-[22px] shadow-[0_18px_40px_rgba(7,25,44,0.05)]";
export const record =
  "rounded-2xl border border-line bg-white px-[18px] py-4 shadow-[0_10px_28px_rgba(7,25,44,0.04)]";
export const recordHead = "flex items-start justify-between gap-4";
export const recordTitle = "text-xl font-semibold tracking-[-0.03em]";
export const kick = "text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-teal";
export const meta = "text-[0.92rem] text-soft";
export const actions = "mt-3 flex flex-wrap gap-2.5";
export const settled = "mt-3 rounded-xl bg-paper px-4 py-3.5 text-body";
export const notice = "mb-1 rounded-xl bg-paper px-3.5 py-3 text-body";
export const sectionLabel = "mb-2.5 mt-[18px] text-xl font-semibold tracking-[-0.03em]";
export const stack = "grid gap-3";
export const noteDesk = "grid gap-3.5";
export const findings = "mt-[18px] grid gap-3 md:grid-cols-2";
export const finding = "rounded-2xl bg-[#f7fbfb] px-3.5 pb-2 pt-3.5";
export const findingTitle = "text-[1.02rem] font-semibold";
export const points = "my-2 grid gap-2";
export const point = "rounded-xl border border-line bg-white px-3 py-2.5";
export const sourceLink = "mt-2 block text-left font-semibold text-deep";
export const sourceQuote = "mt-2 text-soft";
export const emptyLine = "mt-2 text-soft";
export const prose = "font-serif text-[1.08rem] leading-[1.55] text-ink";
export const skip =
  "absolute left-3 top-[-48px] z-40 rounded-lg bg-navy px-3 py-2 text-white focus:top-3";
export const logo =
  "inline-flex items-center gap-2.5 text-xl font-bold tracking-[-0.04em] text-ink";
export const logoMark = "block size-2.5 rounded-[3px] bg-teal";
export const sheetHead = "mb-1 flex items-start justify-between gap-4";
export const cardTitle = "text-[1.45rem] font-semibold tracking-[-0.03em]";

export function tone(kind, pressed = false) {
  const base = "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold not-italic";
  if (pressed) return `${base} bg-white text-deep`;
  if (kind === "ready") return `${base} bg-sand text-clay`;
  if (kind === "sent" || kind === "approved") return `${base} bg-mint text-deep`;
  return `${base} bg-paper text-soft`;
}

export function tag(quiet) {
  return quiet ? "text-[0.82rem] font-medium text-soft" : "text-[0.82rem] font-semibold text-deep";
}
