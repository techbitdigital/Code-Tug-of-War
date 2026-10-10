"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Check, Lock, X, Zap } from "lucide-react";
import { motionTokens } from "@/lib/motion";
import type { Answer } from "@/lib/types";
import TeamMarker from "./TeamMarker";

export type Side = "a" | "b";

/**
 * hidden    before the question starts: options masked
 * open      answering
 * locked-in this team has answered; shows "Locked in" without saying right or wrong
 * reveal    round over: right answer in green, this team's wrong pick in red
 * idle      nothing to do (paused)
 */
export type PanelStatus = "hidden" | "open" | "locked-in" | "reveal" | "idle";

// Full class strings so Tailwind can see them.
const SIDE = {
  a: {
    head: "bg-gradient-to-br from-team-a-bright to-team-a",
    band: "bg-team-a-deep/25",
    chip: "bg-team-a text-white",
    picked: "border-team-a bg-team-a-soft shadow-[0_4px_0_var(--team-a)]",
    pull: "bg-gradient-to-b from-team-a-bright to-team-a shadow-[0_5px_0_var(--team-a-deep)]",
    lockBadge: "bg-team-a",
  },
  b: {
    head: "bg-gradient-to-br from-team-b-bright to-team-b",
    band: "bg-team-b-deep/25",
    chip: "bg-team-b text-white",
    picked: "border-team-b bg-team-b-soft shadow-[0_4px_0_var(--team-b)]",
    pull: "bg-gradient-to-b from-team-b-bright to-team-b shadow-[0_5px_0_var(--team-b-deep)]",
    lockBadge: "bg-team-b",
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
  /** How far the rope leans toward this team (the pips under the name). */
  pulls?: number;
  pullsToWin?: number;
  status?: PanelStatus;
  /** Fired by "Lock in": the chosen option index, or the typed text. */
  onAnswer?: (value: number | string) => void;
  /** Controlled pick (from the engine, so keyboard and taps agree). Omit for local state. */
  picked?: number | null;
  onPick?: (index: number) => void;
  /** Keyboard hints shown on the stage: four pick keys and the lock key. */
  keyHints?: { pick: string[]; lock: string };
  /** Seconds this team took to lock in (shown on the "Locked in" card). */
  lockedSeconds?: number;
  /** During the reveal: what this team answered (index or text), if anything. */
  revealValue?: number | string | null;
  /** Robot side in solo mode: shown, but nobody can press its buttons. */
  robot?: boolean;
  /** Name shown in "Waiting for …" once this team has locked in. */
  opponentName?: string;
}

export default function TeamPanel({
  side,
  name,
  answer,
  pulls = 0,
  pullsToWin = 5,
  status = "open",
  onAnswer,
  picked,
  onPick,
  keyHints,
  lockedSeconds,
  revealValue,
  robot = false,
  opponentName,
}: TeamPanelProps) {
  const s = SIDE[side];
  const reduced = useReducedMotion() ?? false;
  const disabled = status !== "open" || robot;

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
          aria-label={`Rope ${pulls} of ${pullsToWin} steps toward ${name}`}
        >
          {Array.from({ length: pullsToWin }, (_, i) => {
            const won = i < pulls;
            return (
              // Each step "pops" its marker in.
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

      <div className="relative flex min-h-0 flex-1 flex-col gap-[var(--gap)] bg-arena/60 p-[var(--pad)]">
        {answer.type === "mcq" ? (
          <McqAnswer
            key={answer.options.join("|")}
            options={answer.options}
            side={side}
            status={status}
            disabled={disabled}
            picked={picked}
            onPick={onPick}
            correctIndex={answer.correctIndex}
            revealValue={revealValue}
            keyHints={keyHints}
            lockLabel={robot ? "Thinking…" : undefined}
            onLock={(i) => onAnswer?.(i)}
          />
        ) : (
          <TextAnswer side={side} disabled={disabled} keyHint={keyHints?.lock} onLock={(v) => onAnswer?.(v)} />
        )}

        {/* Locked in: covers the options so the other team can't see the choice. */}
        {status === "locked-in" && (
          <motion.div
            role="status"
            initial={reduced ? false : { opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={motionTokens.snap}
            className="absolute inset-0 flex flex-col items-center justify-center gap-[calc(var(--gap)*0.5)] bg-surface/90 text-center backdrop-blur-[3px]"
          >
            <span className={`flex size-[calc(var(--chip)*1.5)] items-center justify-center rounded-full text-white ${s.lockBadge}`}>
              <Lock className="size-[50%]" strokeWidth={3} aria-hidden="true" />
            </span>
            <span className="font-display text-[length:var(--fs-option)] font-black text-ink">
              {robot ? `${name} locked in` : "Locked in!"}
            </span>
            {lockedSeconds !== undefined && (
              <span className="text-[length:var(--fs-ui)] font-extrabold text-ink-muted">in {lockedSeconds.toFixed(1)}s</span>
            )}
            {opponentName && (
              <span className="text-[length:var(--fs-key)] font-bold text-ink-muted @3xl:text-[length:var(--fs-ui)]">
                Waiting for {opponentName}…
              </span>
            )}
          </motion.div>
        )}
      </div>
    </section>
  );
}

function McqAnswer({
  options,
  side,
  status,
  disabled,
  picked: controlledPick,
  onPick,
  correctIndex,
  revealValue,
  keyHints,
  lockLabel,
  onLock,
}: {
  options: string[];
  side: Side;
  status: PanelStatus;
  disabled: boolean;
  picked?: number | null;
  onPick?: (index: number) => void;
  correctIndex: number;
  revealValue?: number | string | null;
  keyHints?: { pick: string[]; lock: string };
  lockLabel?: string;
  onLock: (index: number) => void;
}) {
  const s = SIDE[side];
  const [localPick, setLocalPick] = useState<number | null>(null);
  const controlled = onPick !== undefined;
  const picked = controlled ? (controlledPick ?? null) : localPick;
  const choose = (i: number) => (controlled ? onPick(i) : setLocalPick(i));
  const revealing = status === "reveal";
  const hidden = status === "hidden";

  return (
    <>
      <div className="grid min-h-0 flex-1 grid-cols-2 gap-[var(--gap)] @3xl:grid-cols-1 @3xl:grid-rows-4">
        {options.map((option, i) => {
          const isPicked = picked === i;
          const isRight = revealing && i === correctIndex;
          const isTheirWrongPick = revealing && revealValue === i && i !== correctIndex;
          const look = isRight
            ? "border-correct bg-[#DCFCE7] shadow-[0_4px_0_var(--correct)]"
            : isTheirWrongPick
              ? "border-wrong bg-[#FEE2E2] shadow-[0_4px_0_var(--wrong)]"
              : revealing
                ? "opacity-45"
                : isPicked && !hidden
                  ? s.picked
                  : "";
          return (
            <button
              key={i}
              type="button"
              disabled={disabled}
              aria-pressed={isPicked}
              onClick={() => choose(i)}
              className={`flex h-[var(--btn-h)] min-h-0 min-w-0 items-center gap-[var(--gap)] px-[calc(var(--gap)*0.8)] text-left font-sans text-[length:var(--fs-option)] font-extrabold text-ink ${
                revealing || status === "locked-in" ? "" : "disabled:opacity-60"
              } ${KEYCAP} ${look} ${FOCUS_RING}`}
            >
              <span
                className={`flex size-[calc(var(--chip)*0.8)] shrink-0 items-center justify-center rounded-[calc(var(--r-key)*0.6)] text-[length:var(--fs-ui)] font-black ${
                  isRight ? "bg-correct text-white" : isTheirWrongPick ? "bg-wrong text-white" : s.chip
                }`}
              >
                {isRight ? (
                  <Check className="size-[70%]" strokeWidth={3.5} aria-label="Correct" />
                ) : isTheirWrongPick ? (
                  <X className="size-[70%]" strokeWidth={3.5} aria-label="Your answer, wrong" />
                ) : (
                  LETTERS[i]
                )}
              </span>
              <span className="min-w-0 truncate font-mono">{hidden ? "• • •" : option}</span>
              {keyHints && !revealing && (
                <span className="ml-auto hidden rounded-md bg-arena px-1.5 text-[length:var(--fs-key)] font-black uppercase text-ink-muted @3xl:inline">
                  {keyHints.pick[i]}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <LockButton
        side={side}
        label={lockLabel}
        keyHint={keyHints?.lock}
        disabled={disabled || picked === null}
        onClick={() => picked !== null && onLock(picked)}
      />
    </>
  );
}

function TextAnswer({
  side,
  disabled,
  keyHint,
  onLock,
}: {
  side: Side;
  disabled: boolean;
  keyHint?: string;
  onLock: (value: string) => void;
}) {
  const [value, setValue] = useState("");
  const trimmed = value.trim();

  return (
    <form
      className="flex flex-col gap-[var(--gap)] @3xl:flex-1"
      onSubmit={(event) => {
        event.preventDefault();
        if (disabled || !trimmed) return;
        onLock(trimmed);
      }}
    >
      <input
        aria-label="Your answer"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        disabled={disabled}
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
        placeholder="Type your answer…"
        className={`h-[var(--pull-h)] min-w-0 rounded-[var(--r-key)] border-2 border-line bg-surface px-[var(--pad)] font-mono text-[length:var(--fs-option)] font-bold text-ink shadow-[inset_0_2px_4px_rgba(27,31,59,0.06)] placeholder:font-sans placeholder:font-semibold placeholder:text-ink-muted/60 disabled:opacity-50 ${FOCUS_RING}`}
      />
      <div className="mt-auto flex gap-[var(--gap)]">
        <button
          type="button"
          disabled={disabled || !value}
          onClick={() => setValue("")}
          className={`h-[var(--pull-h)] w-[30%] bg-[#FFE4E6]! font-sans text-[length:var(--fs-option)] font-black text-wrong disabled:opacity-50 ${KEYCAP} ${FOCUS_RING}`}
          aria-label="Clear"
        >
          C
        </button>
        <LockButton side={side} type="submit" keyHint={keyHint ? "Enter" : undefined} disabled={disabled || !trimmed} className="flex-1" />
      </div>
    </form>
  );
}

function LockButton({
  side,
  disabled,
  onClick,
  type = "button",
  className = "",
  label,
  keyHint,
}: {
  side: Side;
  label?: string;
  keyHint?: string;
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
      className={`relative flex h-[var(--pull-h)] shrink-0 items-center justify-center gap-[calc(var(--gap)*0.6)] rounded-[var(--r-key)] font-display text-[length:calc(var(--fs-option)*1.05)] font-black uppercase tracking-[0.06em] text-white transition-[transform,box-shadow,opacity] active:translate-y-[4px] active:shadow-none disabled:opacity-45 ${s.pull} ${FOCUS_RING} ${className}`}
    >
      {label ?? (
        <>
          Lock in
          <Zap className="size-[1em] fill-focus text-focus" aria-hidden="true" />
        </>
      )}
      {keyHint && (
        <span className="absolute right-[calc(var(--gap)*0.8)] hidden text-[length:var(--fs-key)] font-bold normal-case tracking-normal text-white/75 @3xl:inline">
          {keyHint}
        </span>
      )}
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
