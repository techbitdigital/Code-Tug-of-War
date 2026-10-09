interface TeamMarkerProps {
  side: "a" | "b";
  size?: number;
  className?: string;
  /** Defaults to the team colour. */
  fill?: string;
}

// Team A is a circle, Team B is a triangle: identity never relies on colour alone.
export default function TeamMarker({ side, size = 24, className, fill }: TeamMarkerProps) {
  const colour = fill ?? (side === "a" ? "var(--team-a)" : "var(--team-b)");
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className={className}>
      {side === "a" ? (
        <circle cx="12" cy="12" r="10" fill={colour} />
      ) : (
        <polygon points="12,2 23,21.5 1,21.5" fill={colour} strokeLinejoin="round" />
      )}
    </svg>
  );
}
