import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { login } from "../api.js";
import { DEMO_PASSWORD, LOGINS } from "../roles.js";
import { readSession, writeSession } from "../session.js";
import { Spin } from "../components/Spinner.jsx";
import { btn, field, kicker, logo, logoMark, skip } from "../ui.js";

export default function LoginPage() {
  const navigate = useNavigate();
  const existing = readSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (existing) return <Navigate to={existing.path} replace />;

  async function onSubmit(event) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const user = await login(email.trim(), password);
      const session = writeSession(user);
      if (!session) {
        setError("That login is not one of the four roles.");
        return;
      }
      navigate(session.path, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-svh bg-[linear-gradient(180deg,#f7fbfb_0%,#fff_320px)]">
      <a className={skip} href="#login-form">
        Skip to content
      </a>
      <header className="sticky top-0 z-20 flex items-center border-b border-line bg-white/90 px-7 py-4 backdrop-blur-[14px]">
        <Link className={logo} to="/">
          <i className={logoMark} aria-hidden="true" />
          Nookly
        </Link>
      </header>
      <main className="mx-auto mt-12 mb-20 grid w-[min(860px,calc(100%-40px))] items-start gap-7 max-md:mt-6 md:grid-cols-[minmax(280px,420px)_minmax(240px,360px)]">
        <form
          id="login-form"
          className="rounded-[18px] border border-line bg-white p-[22px]"
          onSubmit={onSubmit}
        >
          <p className={kicker}>Sign in</p>
          <h1 className="mt-1.5 mb-2 text-[1.7rem] font-semibold tracking-[-0.04em]">Your login</h1>
          <p className="mb-4 text-soft">
            Each person opens their own dashboard. The landing page does not sign anyone in.
          </p>
          <label className="mt-3 mb-1.5 block text-xs font-semibold tracking-[0.12em] text-soft uppercase" htmlFor="login-email">
            Email
          </label>
          <input
            id="login-email"
            className={field}
            type="email"
            autoComplete="username"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          <label className="mt-3 mb-1.5 block text-xs font-semibold tracking-[0.12em] text-soft uppercase" htmlFor="login-password">
            Password
          </label>
          <input
            id="login-password"
            className={field}
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          {error && (
            <p className="mt-3 text-clay" role="alert">
              {error}
            </p>
          )}
          <button className={`${btn} mt-4`} type="submit" disabled={busy}>
            <Spin on={busy} />
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <section className="rounded-[18px] border border-line bg-white p-[22px]" aria-label="Staff logins">
          <h2 className="mb-2 text-[1.05rem] font-semibold">The four logins</h2>
          <p className="mb-3 text-soft">
            Password for each: <strong className="font-semibold text-ink">{DEMO_PASSWORD}</strong>
          </p>
          <ul className="grid gap-2">
            {LOGINS.map((person) => (
              <li key={person.email}>
                <button
                  type="button"
                  className="w-full rounded-xl border border-line bg-paper px-3 py-2.5 text-left"
                  onClick={() => setEmail(person.email)}
                >
                  <strong className="block font-semibold">{person.name}</strong>
                  <span className="block text-[0.85rem] text-soft">{person.label}</span>
                  <span className="block text-[0.85rem] text-soft">{person.email}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}
