export function Spinner({ className = "size-12", tone = "teal" }) {
  return (
    <svg
      className={`animate-spin ${tone === "current" ? "text-current" : "text-deep"} ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeOpacity="0.18" strokeWidth="4.5" />
      <path fill="currentColor" d="M12 1.5a10.5 10.5 0 0 1 9.1 5.25l-3.9 2.25A6 6 0 0 0 12 6V1.5z" />
    </svg>
  );
}

export function Spin({ on, className = "size-4" }) {
  if (!on) return null;
  return <Spinner className={className} tone="current" />;
}
