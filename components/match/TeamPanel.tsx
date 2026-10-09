"use client";

import TeamMarker from "./TeamMarker";

export type Side = "a" | "b";

// Full class strings so Tailwind can see them.
// White on #FF6A3D is only 2.9:1, so Team B chips use ink text (6.4:1).
const SIDE = {
  a: {
    border: "border-team-a",
    chip: "bg-team-a text-white",
    keys: ["1", "2", "3", "4"],
  },
  b: {
    border: "border-team-b",
    chip: "bg-team-b text-ink",
    keys: ["7", "8", "9", "0"],
  },
} as const;

const LETTERS = ["A", "B", "C", "D"];

interface TeamPanelProps {
  side: Side;
  name: string;
  options: string[];
  locked?: boolean;
  onAnswer?: (index: number) => void;
}

export default function TeamPanel({
  side,
  name,
  options,
  locked = false,
  onAnswer,
}: TeamPanelProps) {
  const s = SIDE[side];

  return (
    <section
      aria-label={`${name} answers`}
      className={`rounded-lg border-[3px] bg-surface p-4 shadow-panel ${s.border}`}
    >
      <header className="mb-3 flex items-center gap-3">
        <TeamMarker side={side} size={28} />
        <h2 className="font-display text-name font-bold uppercase tracking-[0.04em]">
          {name}
        </h2>
      </header>

      <div className="grid grid-cols-2 gap-3">
        {options.map((option, i) => (
          <button
            key={i}
            type="button"
            disabled={locked}
            onClick={() => onAnswer?.(i)}
            className="flex h-14 items-center gap-3 rounded-md border-[3px] border-ink bg-surface px-3 text-left font-sans text-option font-semibold transition-transform active:scale-[0.96] focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-focus disabled:opacity-50"
          >
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-sm text-sm font-bold ${s.chip}`}
            >
              {LETTERS[i]}
            </span>
            <span className="truncate">{option}</span>
            <span className="ml-auto text-xs font-medium text-ink-muted">{s.keys[i]}</span>
          </button>
        ))}
      </div>
    </section>
  );
}