import { Link, Outlet, useNavigate } from "react-router-dom";
import { today } from "../roles.js";
import { clearSession } from "../session.js";
import { useMorning } from "../useMorning.js";
import { ghost, logo, logoMark, skip } from "../ui.js";

export default function Desk({ session }) {
  const morning = useMorning();
  const navigate = useNavigate();

  function signOut() {
    clearSession();
    navigate("/login", { replace: true });
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f7fbfb_0%,#fff_280px)]">
      <a className={skip} href="#desk-main">
        Skip to content
      </a>
      <header className="sticky top-0 z-20 flex flex-wrap items-center gap-7 border-b border-line bg-white/90 px-7 py-4 backdrop-blur-[14px] max-md:gap-3 max-md:px-4">
        <Link className={logo} to="/">
          <i className={logoMark} aria-hidden="true" />
          Nookly
        </Link>
        <p>
          <span className="rounded-full bg-navy px-3 py-2 text-white">{session.roleLabel}</span>
        </p>
        <p className="ml-auto text-right text-[0.92rem] text-soft max-md:ml-0 max-md:text-left">
          {session.name}
          <span className="block font-semibold text-ink">{today}</span>
        </p>
        <button className={ghost} type="button" onClick={signOut}>
          Sign out
        </button>
      </header>
      <main id="desk-main" className="mx-auto w-[min(1120px,calc(100%-48px))] py-9 pb-20 max-sm:w-[min(1120px,calc(100%-32px))] [&>*]:animate-rise">
        <Outlet context={morning} />
      </main>
    </div>
  );
}
