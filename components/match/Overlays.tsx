"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Pause, Play, RotateCcw, Timer, Trophy, Zap } from "lucide-react";
import type { MatchState, RoundResult, Side } from "@/lib/engine";
import { motionTokens } from "@/lib/motion";
import TeamMarker from "./TeamMarker";

const TEAM_TEXT = { a: "text-team-a", b: "text-team-b" } as const;
const TEAM_BG = {
  a: "bg-gradient-to-br from-team-a-bright to-team-a",
  b: "bg-gradient-to-br from-team-b-bright to-team-b",
} as const;

// Big friendly keycap button used on every overlay.
function ActionButton({
  children,
  onClick,
  autoFocus,
  tone = "accent",
}: {
  children: ReactNode;
  onClick: () => void;
  autoFocus?: boolean;
  tone?: "accent" | "a" | "b" | "plain";
}) {
  const toneClass = {
    accent: "bg-gradient-to-b from-[#8B5CF6] to-accent text-white shadow-[0_5px_0_#5B21B6]",
    a: "bg-gradient-to-b from-team-a-bright to-team-a text-white shadow-[0_5px_0_var(--team-a-deep)]",
    b: "bg-gradient-to-b from-team-b-bright to-team-b text-white shadow-[0_5px_0_var(--team-b-deep)]",
    plain: "bg-surface text-ink border-2 border-line shadow-key",
  }[tone];
  return (
    <button
      type="button"
      autoFocus={autoFocus}
      onClick={onClick}
      className={`inline-flex h-[var(--pull-h)] items-center justify-center gap-[calc(var(--gap)*0.6)] rounded-[var(--r-key)] px-[calc(var(--pad)*1.4)] font-display text-[length:var(--fs-option)] font-black transition-[transform,box-shadow] active:translate-y-[4px] active:shadow-none focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-focus ${toneClass}`}
    >
      {children}
    </button>
  );
}

/** Dimmed backdrop + centred card over the whole stage. */
function Modal({ children, label }: { children: ReactNode; label: string }) {
  const reduced = useReducedMotion() ?? false;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={label}
      className="fixed inset-0 z-40 flex items-center justify-center bg-ink/35 p-[var(--pad)] backdrop-blur-[3px] @3xl:absolute"
    >
      <motion.div
        initial={reduced ? false : { scale: 0.9, opacity: 0, y: 12 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={motionTokens.settle}
        className="flex w-full max-w-[min(92%,40rem)] flex-col items-center gap-[calc(var(--gap)*1.4)] rounded-[var(--r-card)] bg-surface p-[calc(var(--pad)*1.6)] text-center shadow-panel"
      >
        {children}
      </motion.div>
    </div>
  );
}

function Versus({ names }: { names: Record<Side, string> }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-[var(--gap)] font-display text-[length:var(--fs-option)] font-black">
      <span className={`flex items-center gap-2 ${TEAM_TEXT.a}`}>
        <TeamMarker side="a" className="size-[0.8em]" />
        {names.a}
      </span>
      <span className="text-[length:var(--fs-ui)] text-ink-muted">vs</span>
      <span className={`flex items-center gap-2 ${TEAM_TEXT.b}`}>
        <TeamMarker side="b" className="size-[0.8em]" />
        {names.b}
      </span>
    </div>
  );
}

export function ReadyCard({ state, onStart }: { state: MatchState; onStart: () => void }) {
  const { config } = state;
  return (
    <Modal label="Ready to start">
      <h2 className="font-display text-[length:calc(var(--fs-prompt)*1.3)] font-black leading-none text-ink">
        Ready to pull?
      </h2>
      <Versus names={config.teamNames} />
      <p className="text-[length:var(--fs-ui)] font-bold text-ink-muted">
        {config.rounds.length} questions · first to {config.pullsToWin} pulls wins
      </p>
      {config.mode === "group" ? (
        <p className="rounded-[var(--r-key)] bg-arena px-[var(--pad)] py-[var(--gap)] text-[length:var(--fs-key)] font-bold text-ink-muted @3xl:text-[length:var(--fs-ui)]">
          On one keyboard: <b className="text-team-a">{config.teamNames.a}</b> picks with 1–4 and pulls with Space ·{" "}
          <b className="text-team-b">{config.teamNames.b}</b> picks with 7–0 and pulls with Enter
        </p>
      ) : (
        <p className="text-[length:var(--fs-ui)] font-bold text-ink-muted">
          Beat the robot: answer right before it does. A wrong answer freezes you for a moment.
        </p>
      )}
      <ActionButton onClick={onStart} autoFocus>
        Start match <Zap className="size-[1em] fill-focus text-focus" aria-hidden="true" />
      </ActionButton>
    </Modal>
  );
}

export function PausedCard({ onResume }: { onResume: () => void }) {
  return (
    <Modal label="Paused">
      <span className="flex size-[calc(var(--chip)*1.8)] items-center justify-center rounded-full bg-arena text-ink">
        <Pause className="size-[45%]" strokeWidth={2.5} aria-hidden="true" />
      </span>
      <h2 className="font-display text-[length:calc(var(--fs-prompt)*1.2)] font-black text-ink">Paused</h2>
      <p className="text-[length:var(--fs-ui)] font-bold text-ink-muted">The clock is stopped. Nobody can answer.</p>
      <ActionButton onClick={onResume} autoFocus>
        <Play className="size-[1em] fill-current" aria-hidden="true" /> Resume
      </ActionButton>
    </Modal>
  );
}

/**
 * Covers the question card once a round ends: who pulled, the right answer and the
 * first line of the explanation. Step 5 replaces the body with the full
 * beneath-the-line reveal.
 */
export function RoundBanner({
  result,
  names,
  answerText,
  explanation,
  matchOver,
  onNext,
}: {
  result: RoundResult;
  names: Record<Side, string>;
  answerText: string;
  explanation?: string;
  matchOver: boolean;
  onNext: () => void;
}) {
  const reduced = useReducedMotion() ?? false;
  const w = result.winner;
  const headline = w ? `${names[w]} pulls!` : result.reason === "timeout" ? "Time's up!" : "Skipped";

  return (
    <motion.div
      role="status"
      initial={reduced ? false : { opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={motionTokens.settle}
      className="absolute inset-0 z-20 flex flex-col overflow-hidden rounded-[var(--r-card)] bg-surface shadow-panel"
    >
      <div
        className={`flex items-center justify-center gap-[var(--gap)] px-[var(--pad)] py-[calc(var(--gap)*1.2)] text-white ${
          w ? TEAM_BG[w] : "bg-gradient-to-br from-[#6B7090] to-ink"
        }`}
      >
        {w ? (
          <Zap className="size-[1.1em] fill-focus text-focus" aria-hidden="true" />
        ) : (
          <Timer className="size-[1.1em]" aria-hidden="true" />
        )}
        <span className="font-display text-[length:var(--fs-prompt)] font-black">{headline}</span>
        {w && result.timeMs !== null && (
          <span className="rounded-full bg-white/20 px-3 py-0.5 text-[length:var(--fs-ui)] font-extrabold">
            {(result.timeMs / 1000).toFixed(1)}s
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col items-center justify-center gap-[var(--gap)] p-[var(--pad)] text-center">
        <p className="text-[length:var(--fs-ui)] font-bold uppercase tracking-[0.08em] text-ink-muted">The answer</p>
        <p className="rounded-[var(--r-key)] bg-[#DCFCE7] px-[var(--pad)] py-[calc(var(--gap)*0.5)] font-mono text-[length:var(--fs-prompt)] font-bold text-correct">
          {answerText}
        </p>
        {explanation && (
          <p className="max-w-[90%] text-[length:var(--fs-option)] font-bold leading-snug text-ink">{explanation}</p>
        )}
      </div>
      <div className="flex justify-center p-[var(--pad)] pt-0">
        <ActionButton onClick={onNext} autoFocus tone={w ?? "accent"}>
          {matchOver ? "See results" : "Next question"} <ArrowRight className="size-[1em]" strokeWidth={3} aria-hidden="true" />
        </ActionButton>
      </div>
    </motion.div>
  );
}

export function ResultCard({ state, onRestart }: { state: MatchState; onRestart: () => void }) {
  const { winner, config, history, teams } = state;
  const fastest = (side: Side) => {
    const times = history.filter((r) => r.winner === side && r.timeMs !== null).map((r) => r.timeMs!);
    return times.length ? `${(Math.min(...times) / 1000).toFixed(1)}s` : "–";
  };

  return (
    <Modal label="Match result">
      <span
        className={`flex size-[calc(var(--chip)*2)] items-center justify-center rounded-full text-white ${
          winner ? TEAM_BG[winner] : "bg-ink-muted"
        }`}
      >
        <Trophy className="size-[50%]" strokeWidth={2.5} aria-hidden="true" />
      </span>
      <h2 className="font-display text-[length:calc(var(--fs-prompt)*1.3)] font-black leading-none text-ink">
        {winner ? (
          <>
            <span className={TEAM_TEXT[winner]}>{config.teamNames[winner]}</span> wins!
          </>
        ) : (
          "It's a draw!"
        )}
      </h2>
      <table className="w-full max-w-[28rem] text-[length:var(--fs-ui)] font-bold">
        <thead>
          <tr className="text-ink-muted">
            <th className="py-1 text-left font-bold" />
            <th className={`py-1 font-black ${TEAM_TEXT.a}`}>{config.teamNames.a}</th>
            <th className={`py-1 font-black ${TEAM_TEXT.b}`}>{config.teamNames.b}</th>
          </tr>
        </thead>
        <tbody className="text-ink">
          <tr className="border-t border-line">
            <td className="py-2 text-left text-ink-muted">Correct answers</td>
            <td>{teams.a.correctTotal}</td>
            <td>{teams.b.correctTotal}</td>
          </tr>
          <tr className="border-t border-line">
            <td className="py-2 text-left text-ink-muted">Fastest pull</td>
            <td>{fastest("a")}</td>
            <td>{fastest("b")}</td>
          </tr>
        </tbody>
      </table>
      <p className="text-[length:var(--fs-ui)] font-bold text-ink-muted">
        {history.length} of {config.rounds.length} questions played
      </p>
      <ActionButton onClick={onRestart} autoFocus>
        <RotateCcw className="size-[1em]" strokeWidth={3} aria-hidden="true" /> Play again
      </ActionButton>
    </Modal>
  );
}
