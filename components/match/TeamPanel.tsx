"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Check, X, Zap } from "lucide-react";
import { motionTokens } from "@/lib/motion";
import type { Answer } from "@/lib/types";
import TeamMarker from "./TeamMarker";

export type Side = "a" | "b";

// Full class strings so Tailwind can see them.
const SIDE = {
  a: {
    head: "bg-gradient-to-br from-team-a-bright to-team-a",
    band: "bg-team-a-deep/25",
    chip: "bg-team-a text-white",
    picked: "border-team-a bg-team-a-soft shadow-[0_4px_0_var(--team-a)]",
    pull: "bg-gradient-to-b from-team-a-bright to-team-a shadow-[0_5px_0_var(--team-a-deep)]",
    keys: ["1", "2", "3", "4"],
    pullKey: "Space",
  },
  b: {
    head: "bg-gradient-to-br from-team-b-bright to-team-b",
    band: "bg-team-b-deep/25",
    chip: "bg-team-b text-white",
    picked: "border-team-b bg-team-b-soft shadow-[0_4px_0_var(--team-b)]",
    pull: "bg-gradient-to-b from-team-b-bright to-team-b shadow-[0_5px_0_var(--team-b-deep)]",
    keys: ["7", "8", "9", "0"],
    pullKey: "Enter",
  },
} as const;

const LETTERS = ["A", "B", "C", "D"];

const FOCUS_RING =
  "focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-focus";

const KEYCAP =
  "rounded-[var(--r-key)] border-2 border-line bg-surface shadow-key transition-[transform,box-shadow] active:translate-y-[3px] active:shadow-[0_1px_0_var(--key-edge)]";

interface TeamPanelProps {
  side: Side;
  name: string;
  answer: Answer;
  /** Pulls this team has won so far, shown as the meter under the name. */
  pulls?: number;
  pullsToWin?: number;
  locked?: boolean;
  /** Fired by PULL: the chosen option index, or the typed text. */
  onAnswer?: (value: number | string) => void;
  /** Controlled pick (from the engine, so keyboard and taps agree). Omit for local state. */
  picked?: number | null;
  onPick?: (index: number) => void;
  /** True while the team is frozen after a wrong answer. */
  cooling?: boolean;
  /** Increments on each wrong answer; every change shakes the panel. */
  wrongCount?: number;
  /** During the reveal: highlights the right option. */
  correctIndex?: number;
  /** Robot side in solo mode: shown, but nobody can press its buttons. */
  robot?: boolean;
}

export default function TeamPanel({
  side,
  name,
  answer,
  pulls = 0,
  pullsToWin = 5,
  locked = false,
  onAnswer,
  picked,
  onPick,
  cooling = false,
  wrongCount = 0,
  correctIndex,
  robot = false,
}: TeamPanelProps) {
  const s = SIDE[side];
  const reduced = useReducedMotion() ?? false;

  return (
    <section
      aria-label={`${name} answers`}
      className="flex h-full flex-col overflow-hidden rounded-[var(--r-card)] bg-surface shadow-panel"
    >
      <header className={`text-white ${s.head}`}>
        <div className="flex h-[var(--head-h)] items-center justify-center gap-[var(--gap)] px-[var(--pad)]">
          <BotFace />
          <h2 className="truncate font-display text-[length:var(--fs-name)] font-black uppercase tracking-[0.04em]">
            {name}
          </h2>
        </div>
        <div
          className={`flex items-center justify-center gap-[calc(var(--gap)*0.6)] py-[calc(var(--gap)*0.8)] ${s.band}`}
          aria-label={`${pulls} of ${pullsToWin} pulls`}
        >
          {Array.from({ length: pullsToWin }, (_, i) => {
            const won = i < pulls;
            return (
              // Each pull "pops" its marker in.
              <motion.span
                key={i}
                className="flex"
                initial={false}
                animate={{ scale: won ? [1.7, 1] : 1 }}
                transition={reduced ? { duration: 0 } : motionTokens.snap}
              >
                <TeamMarker
                  side={side}
                  fill={won ? "#fff" : "rgba(255,255,255,0.35)"}
                  className="size-[calc(var(--fs-ui)*0.95)]"
                />
              </motion.span>
            );
          })}
        </div>
      </header>

      <motion.div
        key={`wrong-${wrongCount}`}
        initial={false}
        animate={wrongCount > 0 && !reduced ? { x: [0, -12, 12, -8, 8, -3, 0] } : { x: 0 }}
        transition={{ duration: 0.45 }}
        className="relative flex min-h-0 flex-1 flex-col gap-[var(--gap)] bg-arena/60 p-[var(--pad)]"
      >
        {answer.type === "mcq" ? (
          <McqAnswer
            key={answer.options.join("|")}
            options={answer.options}
            side={side}
            locked={locked || cooling || robot}
            picked={picked}
            onPick={onPick}
            correctIndex={correctIndex}
            pullLabel={robot ? "Thinking…" : undefined}
            onPull={(i) => onAnswer?.(i)}
          />
        ) : (
          <TextAnswer side={side} locked={locked || cooling || robot} onPull={(v) => onAnswer?.(v)} />
        )}

        {cooling && (
          <div
            role="status"
            className="absolute inset-0 flex flex-col items-center justify-center gap-[calc(var(--gap)*0.5)] bg-surface/80 text-center backdrop-blur-[2px]"
          >
            <span className="flex size-[calc(var(--chip)*1.4)] items-center justify-center rounded-full bg-wrong text-white">
              <X className="size-[60%]" strokeWidth={3.5} aria-hidden="true" />
            </span>
            <span className="font-display text-[length:var(--fs-option)] font-black text-ink">Not quite!</span>
            <span className="text-[length:var(--fs-ui)] font-bold text-ink-muted">Wait a moment…</span>
          </div>
        )}
      </motion.div>
    </section>
  );
}

function McqAnswer({
  options,
  side,
  locked,
  picked: controlledPick,
  onPick,
  correctIndex,
  pullLabel,
  onPull,
}: {
  options: string[];
  side: Side;
  locked: boolean;
  picked?: number | null;
  onPick?: (index: number) => void;
  correctIndex?: number;
  pullLabel?: string;
  onPull: (index: number) => void;
}) {
  const s = SIDE[side];
  const [localPick, setLocalPick] = useState<number | null>(null);
  useEffect(() => setLocalPick(null), [locked]);
  const controlled = onPick !== undefined;
  const picked = controlled ? (controlledPick ?? null) : localPick;
  const choose = (i: number) => (controlled ? onPick(i) : setLocalPick(i));
  const revealing = correctIndex !== undefined;

  return (
    <>
      <div className="grid min-h-0 flex-1 grid-cols-2 gap-[var(--gap)] @3xl:grid-cols-1 @3xl:grid-rows-4">
        {options.map((option, i) => {
          const isPicked = picked === i;
          const isRight = revealing && i === correctIndex;
          const state = isRight
            ? "border-correct bg-[#DCFCE7] shadow-[0_4px_0_var(--correct)]"
            : revealing
              ? "opacity-45"
              : isPicked
                ? s.picked
                : "";
          return (
            <button
              key={i}
              type="button"
              disabled={locked || revealing}
              aria-pressed={isPicked}
              onClick={() => choose(i)}
              className={`flex h-[var(--btn-h)] min-h-0 min-w-0 items-center gap-[var(--gap)] px-[calc(var(--gap)*0.8)] text-left font-sans text-[length:var(--fs-option)] font-extrabold text-ink ${
                revealing ? "" : "disabled:opacity-50"
              } ${KEYCAP} ${state} ${FOCUS_RING}`}
            >
              <span
                className={`flex size-[calc(var(--chip)*0.8)] shrink-0 items-center justify-center rounded-[calc(var(--r-key)*0.6)] text-[length:var(--fs-ui)] font-black ${
                  isRight ? "bg-correct text-white" : s.chip
                }`}
              >
                {isRight ? <Check className="size-[70%]" strokeWidth={3.5} aria-label="Correct" /> : LETTERS[i]}
              </span>
              <span className="min-w-0 truncate font-mono">{option}</span>
              <span className="ml-auto hidden text-[length:var(--fs-key)] font-bold text-ink-muted @3xl:inline">
                {s.keys[i]}
              </span>
            </button>
          );
        })}
      </div>
      <PullButton
        side={side}
        label={pullLabel}
        disabled={locked || revealing || picked === null}
        onClick={() => picked !== null && onPull(picked)}
      />
    </>
  );
}

function TextAnswer({ side, locked, onPull }: { side: Side; locked: boolean; onPull: (value: string) => void }) {
  const [value, setValue] = useState("");
  const trimmed = value.trim();

  return (
    <form
      className="flex flex-col gap-[var(--gap)] @3xl:flex-1"
      onSubmit={(event) => {
        event.preventDefault();
        if (locked || !trimmed) return;
        onPull(trimmed);
        setValue("");
      }}
    >
      <input
        aria-label="Your answer"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        disabled={locked}
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
        placeholder="Type your answer…"
        className={`h-[var(--pull-h)] min-w-0 rounded-[var(--r-key)] border-2 border-line bg-surface px-[var(--pad)] font-mono text-[length:var(--fs-option)] font-bold text-ink shadow-[inset_0_2px_4px_rgba(27,31,59,0.06)] placeholder:font-sans placeholder:font-semibold placeholder:text-ink-muted/60 disabled:opacity-50 ${FOCUS_RING}`}
      />
      <div className="mt-auto flex gap-[var(--gap)]">
        <button
          type="button"
          disabled={locked || !value}
          onClick={() => setValue("")}
          className={`h-[var(--pull-h)] w-[30%] bg-[#FFE4E6]! font-sans text-[length:var(--fs-option)] font-black text-wrong disabled:opacity-50 ${KEYCAP} ${FOCUS_RING}`}
          aria-label="Clear"
        >
          C
        </button>
        <PullButton side={side} type="submit" disabled={locked || !trimmed} className="flex-1" />
      </div>
    </form>
  );
}

function PullButton({
  side,
  disabled,
  onClick,
  type = "button",
  className = "",
  label,
}: {
  side: Side;
  label?: string;
  disabled: boolean;
  onClick?: () => void;
  type?: "button" | "submit";
  className?: string;
}) {
  const s = SIDE[side];
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`relative flex h-[var(--pull-h)] shrink-0 items-center justify-center gap-[calc(var(--gap)*0.6)] rounded-[var(--r-key)] font-display text-[length:calc(var(--fs-option)*1.1)] font-black uppercase tracking-[0.06em] text-white transition-[transform,box-shadow,opacity] active:translate-y-[4px] active:shadow-none disabled:opacity-45 ${s.pull} ${FOCUS_RING} ${className}`}
    >
      {label ?? (
        <>
          Pull
          <Zap className="size-[1em] fill-focus text-focus" aria-hidden="true" />
        </>
      )}
      <span className="absolute right-[calc(var(--gap)*0.8)] hidden text-[length:var(--fs-key)] font-bold normal-case tracking-normal text-white/70 @3xl:inline">
        {s.pullKey}
      </span>
    </button>
  );
}

// The team avatar: a Byte Bot head in a white disc.
function BotFace() {
  return (
    <svg viewBox="0 0 40 40" aria-hidden="true" className="size-[var(--chip)] shrink-0">
      <circle cx="20" cy="20" r="19" fill="#fff" />
      <line x1="20" y1="7" x2="21" y2="3" stroke="var(--ink)" strokeWidth="2" strokeLinecap="round" />
      <circle cx="21" cy="3.5" r="2.5" fill="var(--focus)" stroke="var(--ink)" strokeWidth="1.5" />
      <rect x="8" y="8" width="24" height="21" rx="7" fill="#fff" stroke="var(--ink)" strokeWidth="2.2" />
      <rect x="12" y="13" width="16" height="9" rx="4.5" fill="var(--ink)" />
      <circle cx="16.5" cy="17.5" r="1.8" fill="#5EEAD4" />
      <circle cx="23.5" cy="17.5" r="1.8" fill="#5EEAD4" />
    </svg>
  );
}
