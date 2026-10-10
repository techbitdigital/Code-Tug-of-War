// The match engine: a pure reducer, so every rule is testable without React or timers.
// Time is always passed in on the action (`now`, in ms); the reducer never reads a clock.
//
// Rules (agreed after the Oct 10 playtest):
// - Each team locks in ONE answer per round. Nobody sees right or wrong until the reveal.
// - The round ends when both teams have locked in, the time runs out, or the host closes it.
// - If one team is right, it pulls. If both are right, the faster one pulls.
// - Win rule is rope distance: drag the rope `pullsToWin` steps your way to win early;
//   otherwise whoever the rope leans toward after the last question wins (centre = draw).
import type { Answer, Round } from "./types";

export type Side = "a" | "b";
export type Phase = "ready" | "countdown" | "question" | "reveal" | "over";

export interface MatchConfig {
  rounds: Round[];
  pullsToWin: 3 | 5 | 7;
  /** "group": two teams on one screen. "solo": Team A is the player, Team B is the robot. */
  mode: "group" | "solo";
  teamNames: Record<Side, string>;
  /** Used when a round has no timeLimitSec of its own. */
  defaultTimeLimitSec: number;
  /** The 3-2-1 before the first question. 0 skips it. */
  countdownMs: number;
  /** Solo only: how often the robot gets it right, 0..1. */
  robotAccuracy: number;
  /** Solo only: the robot locks in somewhere in this window after the question appears. */
  robotDelayMs: [number, number];
  /** Seeds the robot so a match can be replayed exactly (and tested). */
  seed: number;
}

export const DEFAULT_CONFIG: Omit<MatchConfig, "rounds"> = {
  pullsToWin: 3,
  mode: "group",
  teamNames: { a: "Team A", b: "Team B" },
  defaultTimeLimitSec: 30,
  countdownMs: 3000,
  robotAccuracy: 0.65,
  robotDelayMs: [6000, 14000],
  seed: 1,
};

export interface LockedAnswer {
  value: number | string;
  correct: boolean;
  /** ms from the question appearing to locking in. */
  timeMs: number;
}

export interface TeamState {
  /** Option chosen but not yet locked in (multiple choice only). */
  picked: number | null;
  /** This round's answer once locked in. */
  locked: LockedAnswer | null;
  correctTotal: number;
  wrongTotal: number;
}

export interface RoundResult {
  roundId: string;
  /** Team that pulled, or null when nobody was right (or nobody answered). */
  winner: Side | null;
  reason: "only-correct" | "faster" | "none-correct" | "no-answers" | "closed";
  answers: Record<Side, LockedAnswer | null>;
  /** Rope position after this round. */
  rope: number;
}

export interface RobotPlan {
  at: number;
  correct: boolean;
}

export interface MatchState {
  config: MatchConfig;
  phase: Phase;
  roundIndex: number;
  /** -pullsToWin (Team A wins) ... +pullsToWin (Team B wins). */
  rope: number;
  teams: Record<Side, TeamState>;
  /** End of the 3-2-1 countdown. */
  countdownEndsAt: number;
  questionStartedAt: number;
  deadline: number;
  /** Set while paused; resuming shifts every pending time by the pause length. */
  pausedAt: number | null;
  robot: RobotPlan | null;
  lastResult: RoundResult | null;
  history: RoundResult[];
  /** null = draw. Only meaningful in the "over" phase. */
  winner: Side | null;
}

export type MatchAction =
  | { type: "START"; now: number }
  | { type: "PICK"; side: Side; index: number }
  | { type: "ANSWER"; side: Side; value: number | string; now: number }
  | { type: "TICK"; now: number }
  | { type: "CLOSE"; now: number }
  | { type: "NEXT"; now: number }
  | { type: "PAUSE"; now: number }
  | { type: "RESUME"; now: number }
  | { type: "RESTART" };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const freshTeam = (): TeamState => ({ picked: null, locked: null, correctTotal: 0, wrongTotal: 0 });

/** Small deterministic PRNG (mulberry32): same seed, same robot. */
function random(seed: number) {
  let t = (seed + 0x6d2b79f5) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function normalise(text: string, caseSensitive?: boolean) {
  const collapsed = text.trim().replace(/\s+/g, " ");
  return caseSensitive ? collapsed : collapsed.toLowerCase();
}

export function isCorrect(answer: Answer, value: number | string): boolean {
  if (answer.type === "mcq") return value === answer.correctIndex;
  const typed = normalise(String(value), answer.caseSensitive);
  return answer.accept.some((a) => normalise(a, answer.caseSensitive) === typed);
}

export function correctAnswerText(answer: Answer): string {
  return answer.type === "mcq" ? answer.options[answer.correctIndex] : answer.accept[0];
}

/** What a locked answer looks like on screen: the option text, or the typed text. */
export function answerText(answer: Answer, value: number | string): string {
  return answer.type === "mcq" && typeof value === "number" ? answer.options[value] ?? "?" : String(value);
}

export function currentRound(state: MatchState): Round {
  return state.config.rounds[state.roundIndex];
}

export function timeLimitMs(state: MatchState): number {
  return (currentRound(state).timeLimitSec ?? state.config.defaultTimeLimitSec) * 1000;
}

const clampRope = (rope: number, p: number) => Math.max(-p, Math.min(p, rope));

/** Has the match been decided by the rope (rather than by running out of rounds)? */
export function ropeDecided(state: MatchState) {
  return Math.abs(state.rope) >= state.config.pullsToWin;
}

function planRobot(config: MatchConfig, roundIndex: number, now: number): RobotPlan | null {
  if (config.mode !== "solo") return null;
  const r1 = random(config.seed * 7919 + roundIndex * 2);
  const r2 = random(config.seed * 7919 + roundIndex * 2 + 1);
  const [lo, hi] = config.robotDelayMs;
  return { at: now + lo + r1 * (hi - lo), correct: r2 < config.robotAccuracy };
}

/** The robot's answer for this round: the right one, or a plausible wrong one. */
function robotValue(answer: Answer, correct: boolean, salt: number): number | string {
  if (answer.type === "mcq") {
    if (correct) return answer.correctIndex;
    const wrong = answer.options.map((_, i) => i).filter((i) => i !== answer.correctIndex);
    return wrong[Math.floor(random(salt) * wrong.length)];
  }
  return correct ? answer.accept[0] : "?";
}

function startQuestion(state: MatchState, roundIndex: number, now: number): MatchState {
  const round = state.config.rounds[roundIndex];
  const limit = (round.timeLimitSec ?? state.config.defaultTimeLimitSec) * 1000;
  const reset = (t: TeamState): TeamState => ({ ...t, picked: null, locked: null });
  return {
    ...state,
    phase: "question",
    roundIndex,
    questionStartedAt: now,
    deadline: now + limit,
    pausedAt: null,
    robot: planRobot(state.config, roundIndex, now),
    lastResult: null,
    teams: { a: reset(state.teams.a), b: reset(state.teams.b) },
  };
}

function lock(state: MatchState, side: Side, value: number | string, at: number): MatchState {
  const team = state.teams[side];
  const correct = isCorrect(currentRound(state).answer, value);
  return {
    ...state,
    teams: {
      ...state.teams,
      [side]: {
        ...team,
        picked: typeof value === "number" ? value : team.picked,
        locked: { value, correct, timeMs: Math.max(0, at - state.questionStartedAt) },
        correctTotal: team.correctTotal + (correct ? 1 : 0),
        wrongTotal: team.wrongTotal + (correct ? 0 : 1),
      },
    },
  };
}

/** Close the round: decide who pulls from the locked answers. */
function resolve(state: MatchState, closedByHost = false): MatchState {
  const a = state.teams.a.locked;
  const b = state.teams.b.locked;
  let winner: Side | null = null;
  let reason: RoundResult["reason"];

  if (!a && !b) {
    reason = closedByHost ? "closed" : "no-answers";
  } else if (a?.correct && b?.correct) {
    // Both right: speed breaks the tie. An exact tie is no pull.
    winner = a.timeMs < b.timeMs ? "a" : b.timeMs < a.timeMs ? "b" : null;
    reason = "faster";
  } else if (a?.correct) {
    winner = "a";
    reason = "only-correct";
  } else if (b?.correct) {
    winner = "b";
    reason = "only-correct";
  } else {
    reason = "none-correct";
  }

  const rope = winner ? clampRope(state.rope + (winner === "a" ? -1 : 1), state.config.pullsToWin) : state.rope;
  const result: RoundResult = { roundId: currentRound(state).id, winner, reason, answers: { a, b }, rope };
  return { ...state, phase: "reveal", rope, robot: null, pausedAt: null, lastResult: result, history: [...state.history, result] };
}

/** Teams that still have to lock in before the round can end early. */
function waitingOn(state: MatchState): Side[] {
  return (["a", "b"] as Side[]).filter((s) => !state.teams[s].locked);
}

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

export function createMatch(config: MatchConfig): MatchState {
  if (config.rounds.length === 0) throw new Error("A match needs at least one round");
  return {
    config,
    phase: "ready",
    roundIndex: 0,
    rope: 0,
    teams: { a: freshTeam(), b: freshTeam() },
    countdownEndsAt: 0,
    questionStartedAt: 0,
    deadline: 0,
    pausedAt: null,
    robot: null,
    lastResult: null,
    history: [],
    winner: null,
  };
}

export function matchReducer(state: MatchState, action: MatchAction): MatchState {
  switch (action.type) {
    case "START":
      if (state.phase !== "ready") return state;
      if (state.config.countdownMs <= 0) return startQuestion(state, 0, action.now);
      return { ...state, phase: "countdown", countdownEndsAt: action.now + state.config.countdownMs };

    case "PICK": {
      if (state.phase !== "question" || state.pausedAt !== null) return state;
      if (state.teams[action.side].locked) return state;
      const round = currentRound(state);
      if (round.answer.type !== "mcq" || action.index < 0 || action.index >= round.answer.options.length) return state;
      return { ...state, teams: { ...state.teams, [action.side]: { ...state.teams[action.side], picked: action.index } } };
    }

    case "ANSWER": {
      if (state.phase !== "question" || state.pausedAt !== null) return state;
      // In solo mode Team B is the robot; people can't answer for it.
      if (state.config.mode === "solo" && action.side === "b") return state;
      if (action.now >= state.deadline) return state; // too late; TICK closes the round
      if (state.teams[action.side].locked) return state; // one answer per round

      let next = lock(state, action.side, action.value, action.now);

      // Solo: the player shouldn't wait for the robot. Lock the robot in at the time it
      // had planned (if that was before the deadline) and close the round now.
      if (next.config.mode === "solo" && next.robot) {
        const plan = next.robot;
        next = { ...next, robot: null };
        if (plan.at < next.deadline) {
          next = lock(next, "b", robotValue(currentRound(next).answer, plan.correct, next.config.seed + next.roundIndex), plan.at);
        }
        return resolve(next);
      }
      return waitingOn(next).length === 0 ? resolve(next) : next;
    }

    case "TICK": {
      if (state.pausedAt !== null) return state;
      if (state.phase === "countdown") {
        return action.now >= state.countdownEndsAt ? startQuestion(state, 0, state.countdownEndsAt) : state;
      }
      if (state.phase !== "question") return state;

      let next = state;
      if (next.robot && action.now >= next.robot.at) {
        const plan = next.robot;
        next = { ...next, robot: null };
        if (plan.at < next.deadline && !next.teams.b.locked) {
          next = lock(next, "b", robotValue(currentRound(next).answer, plan.correct, next.config.seed + next.roundIndex), plan.at);
          if (waitingOn(next).length === 0) return resolve(next);
        }
      }
      return action.now >= next.deadline ? resolve(next) : next;
    }

    case "CLOSE":
      // Host ends the round early ("Reveal now"); whatever is locked in counts.
      return state.phase === "question" ? resolve(state, true) : state;

    case "NEXT": {
      if (state.phase !== "reveal") return state;
      const isLast = state.roundIndex >= state.config.rounds.length - 1;
      if (ropeDecided(state) || isLast) {
        const winner: Side | null = state.rope < 0 ? "a" : state.rope > 0 ? "b" : null;
        return { ...state, phase: "over", winner };
      }
      return startQuestion(state, state.roundIndex + 1, action.now);
    }

    case "PAUSE":
      if ((state.phase !== "question" && state.phase !== "countdown") || state.pausedAt !== null) return state;
      return { ...state, pausedAt: action.now };

    case "RESUME": {
      if (state.pausedAt === null) return state;
      const gap = action.now - state.pausedAt;
      return {
        ...state,
        pausedAt: null,
        countdownEndsAt: state.countdownEndsAt + gap,
        questionStartedAt: state.questionStartedAt + gap,
        deadline: state.deadline + gap,
        robot: state.robot ? { ...state.robot, at: state.robot.at + gap } : null,
      };
    }

    case "RESTART":
      return createMatch(state.config);
  }
}
