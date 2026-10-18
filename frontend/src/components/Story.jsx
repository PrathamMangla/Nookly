import { useInView } from "../hooks/useInView.js";

export default function Story() {
  const [ref, shown] = useInView(0.2);
  const reveal = shown ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0";

  return (
    <section id="story" className="scroll-mt-[76px] bg-navy pt-28 pb-16 text-[#f3f7f8] max-sm:pt-20 max-sm:pb-12" ref={ref}>
      <div className="ml-[max(24px,calc((100%-1120px)/2))] w-[min(760px,calc(100%-48px))]">
        <p className="mb-3.5 text-xs font-semibold tracking-[0.16em] text-aqua uppercase">The person building it</p>
        <h2
          className={`max-w-[14ch] font-serif text-[clamp(2.5rem,5vw,4.1rem)] leading-[1.12] font-medium tracking-[-0.03em] transition duration-700 ${reveal}`}
        >
          That’s the vision behind Nookly.
        </h2>
        <div className={`mt-2 transition delay-100 duration-700 ${reveal}`}>
          <p className="mt-5 max-w-[40ch] font-serif text-[1.25rem] leading-[1.55] text-[#f3f7f8]/85 max-sm:text-[1.1rem]">
            I’m building Nookly with the ambition of making care documentation smarter, and reducing
            the administrative pressure on care professionals.
          </p>
          <p className="mt-5 max-w-[40ch] font-serif text-[1.25rem] leading-[1.55] text-[#f3f7f8]/85 max-sm:text-[1.1rem]">
            As a University of Hertfordshire alumnus and a healthcare professional, I’m at an early
            stage of this journey, working towards turning this vision into a functional product.
          </p>
          <p className="mt-5 max-w-[40ch] font-serif text-[1.25rem] leading-[1.55] text-[#f3f7f8]/85 max-sm:text-[1.1rem]">
            What you see here is that first shape. How a team would move through a day, and what each
            person would have in front of them.
          </p>
        </div>
        <p className={`mt-9 flex flex-col gap-1 transition delay-200 duration-700 ${reveal}`}>
          <strong className="font-semibold tracking-[-0.02em]">Pratham Mangla</strong>
          <span className="text-[#f3f7f8]/60">University of Hertfordshire · Healthcare</span>
        </p>
      </div>
    </section>
  );
}
