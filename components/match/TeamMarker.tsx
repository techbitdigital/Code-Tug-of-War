interface TeamMarkerProps {
  side: "a" | "b";
  size?: number;
}

export default function TeamMarker({ side, size = 24 }: TeamMarkerProps) {
  const fill = side === "a" ? "var(--team-a)" : "var(--team-b)";
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      {side === "a" ? (
        <circle cx="12" cy="12" r="9.5" fill={fill} stroke="var(--ink)" strokeWidth="2.5" />
      ) : (
        <polygon
          points="12,2.5 22,21 2,21"
          fill={fill}
          stroke="var(--ink)"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
}