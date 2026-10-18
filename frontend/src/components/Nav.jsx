import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { readSession } from "../session.js";
import { logo, logoMark } from "../ui.js";

const LINKS = [
  { id: "how", label: "How it works" },
  { id: "roles", label: "The screens" },
  { id: "story", label: "The story" },
];

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState("");
  const session = readSession();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const sections = LINKS.map((link) => document.getElementById(link.id)).filter(Boolean);
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActive(visible.target.id);
      },
      { rootMargin: "-35% 0px -50% 0px", threshold: [0.1, 0.3, 0.6] }
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  return (
    <header
      className={`sticky top-0 z-20 flex h-[68px] items-center justify-between bg-white/90 px-7 backdrop-blur-[14px] max-sm:h-[60px] max-sm:px-4 ${scrolled ? "border-b border-line" : ""}`}
    >
      <a className={logo} href="#top">
        <i className={logoMark} aria-hidden="true" />
        Nookly
      </a>
      <nav aria-label="Page">
        <ul className="flex gap-[26px] max-sm:gap-3.5">
          {LINKS.map((link) => (
            <li key={link.id}>
              <a
                href={`#${link.id}`}
                aria-current={active === link.id ? "true" : undefined}
                className="text-[0.95rem] font-medium text-soft hover:text-ink max-sm:text-[0.82rem] aria-[current=true]:text-ink aria-[current=true]:shadow-[inset_0_-2px_0_var(--color-teal)]"
              >
                {link.label}
              </a>
            </li>
          ))}
          <li>
            <Link
              className="text-[0.95rem] font-medium text-soft hover:text-ink max-sm:text-[0.82rem]"
              to={session ? session.path : "/login"}
            >
              {session ? "Your shift" : "Sign in"}
            </Link>
          </li>
        </ul>
      </nav>
    </header>
  );
}
