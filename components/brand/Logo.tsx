/** Byte Bot head + wordmark. */
export default function Logo({ size = 40 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-3">
      <svg viewBox="0 0 40 40" width={size} height={size} aria-hidden="true">
        <circle cx="20" cy="20" r="19" fill="var(--accent)" />
        <line x1="20" y1="7" x2="21" y2="3" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
        <circle cx="21" cy="3.5" r="2.5" fill="var(--focus)" />
        <rect x="8" y="9" width="24" height="21" rx="7" fill="#fff" />
        <rect x="12" y="14" width="16" height="9" rx="4.5" fill="var(--ink)" />
        <circle cx="16.5" cy="18.5" r="1.8" fill="#5EEAD4" />
        <circle cx="23.5" cy="18.5" r="1.8" fill="#5EEAD4" />
      </svg>
      <span className="font-display text-xl font-black tracking-tight text-ink">
        Code <span className="text-team-a">Tug</span> of <span className="text-team-b">War</span>
      </span>
    </span>
  );
}
