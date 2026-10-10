"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowDown, Check, Eye, Pause, Play, RotateCcw, Timer, Trophy, X, Zap } from "lucide-react";
import { answerText, correctAnswerText, type LockedAnswer, type MatchState, type RoundResult, type Side } from "@/lib/engine";
import { motionTokens } from "@/lib/motion";
import type { Round } from "@/lib/types";
import { KEYS } from "@/lib/useMatch";
import RopeTrack from "./RopeTrack";
import TeamMarker from "./TeamMarker";

const TEAM_TEXT = { a: "text-team-a", b: "text-team-b" } as const;
const TEAM_BG = {
  a: "bg-gradient-to-br from-team-a-bright to-team-a",
  b: "bg-gradient-to-br from-team-b-bright to-team-b",
} as const;
const SIDES: Side[] = ["a", "b"];

// Big friendly keycap button used on every overlay.
export function ActionButton({
  children,
  onClick,
  autoFocus,
  tone = "accent",
  small = false,
}: {
  children: ReactNode;
  onClick: () => void;
  autoFocus?: boolean;
  tone?: "accent" | "a" | "b" | "plain";
  small?: boolean;
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
      className={`inline-flex items-center justify-center gap-[calc(var(--gap)*0.6)] whitespace-nowrap rounded-[var(--r-key)] font-display font-black transition-[transform,box-shadow] active:translate-y-[4px] active:shadow-none focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-focus ${
        small
          ? "h-[calc(var(--pull-h)*0.7)] px-[var(--pad)] text-[length:var(--fs-ui)]"
          : "h-[var(--pull-h)] px-[calc(var(--pad)*1.4)] text-[length:var(--fs-option)]"
      } ${toneClass}`}
    >
      {children}
    </button>
  );
}

function usePortal() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

/** Dimmed backdrop + centred card, portalled to <body> so nothing can cover it. */
function Modal({ children, label, wide = false }: { children: ReactNode; label: string; wide?: boolean }) {
  const reduced = useReducedMotion() ?? false;
  if (!usePortal()) return null;
  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={label} className="match-dialog-layer">
      <motion.div
        initial={reduced ? false : { scale: 0.9, opacity: 0, y: 12 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={motionTokens.settle}
        className={`match-dialog-card ${wide ? "match-dialog-card--wide" : ""} flex flex-col items-center gap-[calc(var(--gap)*1.2)] rounded-[var(--r-card)] bg-surface p-[calc(var(--pad)*1.5)] text-center shadow-panel`}
      >
        {children}
      </motion.div>
    </div>,
    document.body,
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

function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded-md border border-line bg-surface px-1.5 py-0.5 font-mono text-[0.9em] font-bold text-ink shadow-[0_2px_0_var(--key-edge)]">
      {children}
    </kbd>
  );
}

export function ReadyCard({ state, onStart }: { state: MatchState; onStart: () => void }) {
  const { config } = state;
  const n = config.pullsToWin;
  return (
    <Modal label="Ready to start">
      <h2 className="font-display text-[length:calc(var(--fs-prompt)*1.3)] font-black leading-none text-ink">Ready to pull?</h2>
      <Versus names={config.teamNames} />
      <ul className="flex flex-col gap-1 text-[length:var(--fs-ui)] font-bold text-ink-muted">
        <li>Each team locks in one answer per question.</li>
        <li>Right answers pull the rope. Both right? The faster team pulls.</li>
        <li>
          Drag the rope {n} steps your way to win, or lead after question {config.rounds.length}.
        </li>
      </ul>
      {config.mode === "group" ? (
        <p className="rounded-[var(--r-key)] bg-arena px-[var(--pad)] py-[var(--gap)] text-[length:var(--fs-ui)] font-bold leading-relaxed text-ink-muted">
          <b className="text-team-a">{config.teamNames.a}</b>: <Kbd>Q</Kbd> <Kbd>W</Kbd> <Kbd>E</Kbd> <Kbd>R</Kbd> then <Kbd>Space</Kbd>
          {" · "}
          <b className="text-team-b">{config.teamNames.b}</b>: <Kbd>U</Kbd> <Kbd>I</Kbd> <Kbd>O</Kbd> <Kbd>P</Kbd> then <Kbd>Enter</Kbd>
          <br />
          or tap your own side of the screen
        </p>
      ) : (
        <p className="text-[length:var(--fs-ui)] font-bold text-ink-muted">You get one answer per question. Beat the robot to it.</p>
      )}
      <ActionButton onClick={onStart} autoFocus>
        Start match <Zap className="size-[1em] fill-focus text-focus" aria-hidden="true" />
      </ActionButton>
    </Modal>
  );
}

/** Big 3-2-1 over the stage while the question is still hidden. */
export function Countdown({ seconds }: { seconds: number }) {
  const reduced = useReducedMotion() ?? false;
  if (!usePortal()) return null;
  return createPortal(
    <div role="status" aria-live="assertive" className="match-dialog-layer match-dialog-layer--light">
      <AnimatePresence mode="popLayout">
        <motion.span
          key={seconds}
          initial={reduced ? false : { scale: 2.2, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={reduced ? undefined : { scale: 0.6, opacity: 0 }}
          transition={motionTokens.pull}
          className="font-display text-[clamp(120px,18vw,320px)] font-black leading-none text-accent drop-shadow-[0_8px_0_rgba(91,33,182,0.35)]"
        >
          {seconds}
        </motion.span>
      </AnimatePresence>
      <span className="sr-only">Starting in {seconds}</span>
    </div>,
    document.body,
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

export function headlineFor(result: RoundResult, names: Record<Side, string>) {
  if (result.winner) return `${names[result.winner]} pulls!`;
  switch (result.reason) {
    case "none-correct":
      return "Nobody got it";
    case "no-answers":
      return "Time's up!";
    case "closed":
      return "Round closed";
    default:
      return "No pull: a dead heat";
  }
}

function reasonText(result: RoundResult, names: Record<Side, string>) {
  if (result.reason === "faster" && result.winner) return `Both right. ${names[result.winner]} locked in first.`;
  if (result.reason === "only-correct" && result.winner) return `Only ${names[result.winner]} got it right.`;
  if (result.reason === "faster") return "Both right at exactly the same time.";
  return null;
}

/** Coloured strip naming the round's outcome; also the reveal's header. */
export function ResultStrip({ result, headline, children }: { result: RoundResult; headline: string; children?: ReactNode }) {
  const w = result.winner;
  return (
    <div
      className={`flex flex-wrap items-center justify-center gap-[var(--gap)] px-[var(--pad)] py-[calc(var(--gap)*1.1)] text-white ${
        w ? TEAM_BG[w] : "bg-gradient-to-br from-[#6B7090] to-ink"
      }`}
    >
      {w ? <Zap className="size-[1.1em] fill-focus text-focus" aria-hidden="true" /> : <Timer className="size-[1.1em]" aria-hidden="true" />}
      <span className="font-display text-[length:var(--fs-option)] font-black @3xl:text-[length:var(--fs-prompt)]">{headline}</span>
      {children}
    </div>
  );
}

/** One line per team: what they locked in, right or wrong, and how fast. */
function AnswerRow({ side, name, answer, round }: { side: Side; name: string; answer: LockedAnswer | null; round: Round }) {
  return (
    <div className="flex items-center gap-[var(--gap)] text-left">
      <TeamMarker side={side} className="size-[0.9em] shrink-0" />
      <span className={`w-[30%] shrink-0 truncate font-display font-black ${TEAM_TEXT[side]}`}>{name}</span>
      {answer ? (
        <>
          <span
            className={`flex size-[1.4em] shrink-0 items-center justify-center rounded-full text-white ${answer.correct ? "bg-correct" : "bg-wrong"}`}
          >
            {answer.correct ? <Check className="size-[70%]" strokeWidth={3.5} aria-label="right" /> : <X className="size-[70%]" strokeWidth={3.5} aria-label="wrong" />}
          </span>
          <span className="min-w-0 truncate font-mono font-bold text-ink">{answerText(round.answer, answer.value)}</span>
          <span className="ml-auto shrink-0 font-bold text-ink-muted">{(answer.timeMs / 1000).toFixed(1)}s</span>
        </>
      ) : (
        <span className="font-bold text-ink-muted">no answer</span>
      )}
    </div>
  );
}

/**
 * Covers the question card while the rope moves: who pulled, why, and what each team said.
 * Then the reveal opens (automatically, or on the button).
 */
export function RoundBanner({
  result,
  round,
  names,
  onOpenReveal,
}: {
  result: RoundResult;
  round: Round;
  names: Record<Side, string>;
  onOpenReveal: () => void;
}) {
  const reduced = useReducedMotion() ?? false;
  const why = reasonText(result, names);
  return (
    <motion.div
      role="status"
      initial={reduced ? false : { opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={motionTokens.settle}
      className="absolute inset-0 z-20 flex flex-col overflow-hidden rounded-[var(--r-card)] bg-surface shadow-panel"
    >
      <ResultStrip result={result} headline={headlineFor(result, names)} />
      <div className="flex flex-1 flex-col justify-center gap-[calc(var(--gap)*0.8)] px-[calc(var(--pad)*1.2)] py-[var(--gap)] text-[length:var(--fs-ui)]">
        {why && <p className="text-center font-extrabold text-ink-muted">{why}</p>}
        {SIDES.map((s) => (
          <AnswerRow key={s} side={s} name={names[s]} answer={result.answers[s]} round={round} />
        ))}
        <p className="text-center font-bold text-ink-muted">
          Answer: <span className="font-mono text-correct">{correctAnswerText(round.answer)}</span>
        </p>
      </div>
      <div className="flex justify-center p-[var(--pad)] pt-0">
        <ActionButton onClick={onOpenReveal} tone={result.winner ?? "accent"} small>
          See beneath the line <ArrowDown className="size-[1em]" strokeWidth={3} aria-hidden="true" />
        </ActionButton>
      </div>
    </motion.div>
  );
}

/** The reveal's last step: what each team said, and why the wrong answers are wrong. */
export function AnswersSummary({ result, round, names }: { result: RoundResult; round: Round; names: Record<Side, string> }) {
  const answer = round.answer;
  const whyFor = (value: number | string): string | null => {
    if (answer.type !== "mcq" || typeof value !== "number") return null;
    return answer.why?.[value]?.trim() || null;
  };
  // Wrong options a team picked come first, then the other wrong options.
  const pickedWrong = SIDES.map((s) => result.answers[s]).filter((a): a is LockedAnswer => !!a && !a.correct);
  const pickedIdx = new Set(pickedWrong.map((a) => a.value));
  const otherWrong =
    answer.type === "mcq" ? answer.options.map((_, i) => i).filter((i) => i !== answer.correctIndex && !pickedIdx.has(i)) : [];

  return (
    <div className="flex flex-col gap-[var(--gap)] text-[length:var(--fs-ui)]">
      {SIDES.map((s) => (
        <AnswerRow key={s} side={s} name={names[s]} answer={result.answers[s]} round={round} />
      ))}
      <p className="font-bold text-ink">
        Right answer: <span className="rounded-md bg-[#DCFCE7] px-2 font-mono text-correct">{correctAnswerText(answer)}</span>
      </p>
      {[...new Set(pickedWrong.map((a) => a.value))].map((value) => {
        const text = whyFor(value);
        return text ? (
          <WhyNot key={`p-${value}`} option={answerText(answer, value)} text={text} highlight />
        ) : null;
      })}
      {otherWrong.map((i) => {
        const text = whyFor(i);
        return text ? <WhyNot key={`o-${i}`} option={answerText(answer, i)} text={text} /> : null;
      })}
    </div>
  );
}

function WhyNot({ option, text, highlight = false }: { option: string; text: string; highlight?: boolean }) {
  return (
    <div
      className={`rounded-[calc(var(--r-key)*0.7)] border-l-4 px-[var(--gap)] py-[calc(var(--gap)*0.5)] text-left ${
        highlight ? "border-wrong bg-[#FEE2E2]" : "border-line bg-surface"
      }`}
    >
      <p className="font-extrabold text-ink">
        Why not <span className="font-mono">{option}</span>?
      </p>
      <p className="font-semibold leading-snug text-ink-muted">{text}</p>
    </div>
  );
}

export function ResultCard({
  state,
  onRestart,
  onReplay,
}: {
  state: MatchState;
  onRestart: () => void;
  onReplay: (roundIndex: number) => void;
}) {
  const { winner, config, history, teams, rope } = state;
  const names = config.teamNames;
  const stat = (side: Side) => {
    const answered = history.filter((r) => r.answers[side]).length;
    const right = teams[side].correctTotal;
    const correctTimes = history.map((r) => r.answers[side]).filter((a) => a?.correct).map((a) => a!.timeMs);
    return {
      right,
      wrong: teams[side].wrongTotal,
      accuracy: answered ? `${Math.round((right / answered) * 100)}%` : "–",
      fastest: correctTimes.length ? `${(Math.min(...correctTimes) / 1000).toFixed(1)}s` : "–",
      pulls: history.filter((r) => r.winner === side).length,
    };
  };
  const s = { a: stat("a"), b: stat("b") };
  const rows: [string, keyof ReturnType<typeof stat>][] = [
    ["Pulls", "pulls"],
    ["Right", "right"],
    ["Wrong", "wrong"],
    ["Accuracy", "accuracy"],
    ["Fastest right answer", "fastest"],
  ];

  return (
    <Modal label="Match result" wide>
      <div className="flex items-center gap-[var(--gap)]">
        <span
          className={`flex size-[calc(var(--chip)*1.4)] items-center justify-center rounded-full text-white ${winner ? TEAM_BG[winner] : "bg-ink-muted"}`}
        >
          <Trophy className="size-[50%]" strokeWidth={2.5} aria-hidden="true" />
        </span>
        <h2 className="font-display text-[length:calc(var(--fs-prompt)*1.2)] font-black leading-none text-ink">
          {winner ? (
            <>
              <span className={TEAM_TEXT[winner]}>{names[winner]}</span> wins!
            </>
          ) : (
            "It's a draw!"
          )}
        </h2>
      </div>

      {/* Where the rope ended up */}
      <div className="w-full max-w-[34rem]" style={{ ["--arena-h" as string]: "clamp(110px, 12vw, 200px)" }}>
        <RopeTrack ropePosition={rope} pullsToWin={config.pullsToWin} />
      </div>

      <div className="grid w-full gap-[var(--pad)] text-left md:grid-cols-[1fr_1.2fr]">
        <table className="w-full text-[length:var(--fs-ui)] font-bold">
          <thead>
            <tr className="text-ink-muted">
              <th className="py-1 text-left font-bold" />
              <th className={`py-1 text-center font-black ${TEAM_TEXT.a}`}>{names.a}</th>
              <th className={`py-1 text-center font-black ${TEAM_TEXT.b}`}>{names.b}</th>
            </tr>
          </thead>
          <tbody className="text-ink">
            {rows.map(([label, key]) => (
              <tr key={key} className="border-t border-line">
                <td className="py-1.5 text-ink-muted">{label}</td>
                <td className="text-center">{s.a[key]}</td>
                <td className="text-center">{s.b[key]}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex flex-col gap-1.5 text-[length:var(--fs-ui)]">
          <p className="font-extrabold uppercase tracking-[0.08em] text-ink-muted">Round by round</p>
          <ol className="flex max-h-[14rem] flex-col gap-1.5 overflow-y-auto pr-1">
            {history.map((r, i) => {
              const round = config.rounds[i];
              return (
                <li key={r.roundId} className="flex items-center gap-2 rounded-[calc(var(--r-key)*0.6)] bg-arena px-2 py-1.5">
                  <span className="w-[1.6em] shrink-0 font-black text-ink-muted">{i + 1}</span>
                  <span className="min-w-0 flex-1 truncate font-bold text-ink">{round.concept}</span>
                  {SIDES.map((side) => {
                    const a = r.answers[side];
                    return (
                      <span
                        key={side}
                        title={`${names[side]}: ${a ? (a.correct ? "right" : "wrong") : "no answer"}`}
                        className={`flex size-[1.3em] shrink-0 items-center justify-center rounded-full text-[0.8em] font-black text-white ${
                          !a ? "bg-line text-ink-muted" : a.correct ? "bg-correct" : "bg-wrong"
                        }`}
                      >
                        {!a ? "–" : a.correct ? "✓" : "✗"}
                      </span>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => onReplay(i)}
                    className="inline-flex shrink-0 items-center gap-1 rounded-md border border-line bg-surface px-2 py-0.5 font-bold text-accent hover:bg-accent/5 focus-visible:outline-[3px] focus-visible:outline-focus"
                  >
                    <Eye className="size-[1em]" aria-hidden="true" /> Replay
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
      </div>

      <ActionButton onClick={onRestart} autoFocus>
        <RotateCcw className="size-[1em]" strokeWidth={3} aria-hidden="true" /> Play again
      </ActionButton>
    </Modal>
  );
}

/** A big sheet over everything, used to replay a round's reveal from the results. */
export function ReplaySheet({ children }: { children: ReactNode }) {
  if (!usePortal()) return null;
  return createPortal(
    <div role="dialog" aria-modal="true" aria-label="Replay" className="match-dialog-layer match-dialog-layer--sheet">
      <div className="match-replay @container">{children}</div>
    </div>,
    document.body,
  );
}
