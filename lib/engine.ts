// The match engine: a pure reducer, so every rule is testable without React or timers.
// Time is always passed in on the action (`now`, in ms); the reducer never reads a clock.
import type { Answer, Round } from "./types";

export type Side = "a" | "b";
export type Phase = "ready" | "question" | "reveal" | "over";

export interface MatchConfig {
  rounds: Round[];
  pullsToWin: 3 | 5 | 7;
  /** "group": two teams on one screen. "solo": Team A is the player, Team B is the robot. */
  mode: "group" | "solo";
  teamNames: Record<Side, string>;
  /** Used when a round has no timeLimitSec of its own. */
  defaultTimeLimitSec: number;
  /** A wrong answer freezes that team for this long before it may answer again. */
  lockoutMs: number;
  /** Solo only: how often the robot gets it right, 0..1. */
  robotAccuracy: number;
  /** Solo only: the robot answers somewhere in this window after the question appears. */
  robotDelayMs: [number, number];
  /** Seeds the robot so a match can be replayed exactly (and tested). */
  seed: number;
}

export const DEFAULT_CONFIG: Omit<MatchConfig, "rounds"> = {
  pullsToWin: 5,
  mode: "group",
  teamNames: { a: "Team A", b: "Team B" },
  defaultTimeLimitSec: 30,
  lockoutMs: 3000,
  robotAccuracy: 0.65,
  robotDelayMs: [6000, 14000],
  seed: 1,
};

export interface TeamState {
  /** Option index chosen but not yet pulled (multiple choice only). */
  picked: number | null;
  /** The team can't answer until this time (after a wrong answer). */
  lockedUntil: number;
  /** Wrong answers this round, for the "shake" feedback and stats. */
  wrongThisRound: number;
  correctTotal: number;
}

export interface RoundResult {
  roundId: string;
  /** Team that pulled, or null when time ran out or the host skipped. */
  winner: Side | null;
  reason: "correct" | "timeout" | "skipped";
  /** ms from the question appearing to the winning answer. */
  timeMs: number | null;
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
  | { type: "SKIP"; now: number }
  | { type: "NEXT"; now: number }
  | { type: "PAUSE"; now: number }
  | { type: "RESUME"; now: number }
  | { type: "RESTART" };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const freshTeam = (): TeamState => ({
  picked: null,
  lockedUntil: 0,
  wrongThisRound: 0,
  correctTotal: 0,
});

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

export function currentRound(state: MatchState): Round {
  return state.config.rounds[state.roundIndex];
}

export function timeLimitMs(state: MatchState): number {
  return (currentRound(state).timeLimitSec ?? state.config.defaultTimeLimitSec) * 1000;
}

const clampRope = (rope: number, p: number) => Math.max(-p, Math.min(p, rope));

function planRobot(config: MatchConfig, roundIndex: number, now: number): RobotPlan | null {
  if (config.mode !== "solo") return null;
  const r1 = random(config.seed * 7919 + roundIndex * 2);
  const r2 = random(config.seed * 7919 + roundIndex * 2 + 1);
  const [lo, hi] = config.robotDelayMs;
  return { at: now + lo + r1 * (hi - lo), correct: r2 < config.robotAccuracy };
}

function startQuestion(state: MatchState, roundIndex: number, now: number): MatchState {
  const round = state.config.rounds[roundIndex];
  const limit = (round.timeLimitSec ?? state.config.defaultTimeLimitSec) * 1000;
  return {
    ...state,
    phase: "question",
    roundIndex,
    questionStartedAt: now,
    deadline: now + limit,
    pausedAt: null,
    robot: planRobot(state.config, roundIndex, now),
    lastResult: null,
    teams: {
      a: { ...state.teams.a, picked: null, lockedUntil: 0, wrongThisRound: 0 },
      b: { ...state.teams.b, picked: null, lockedUntil: 0, wrongThisRound: 0 },
    },
  };
}

function endRound(state: MatchState, result: RoundResult): MatchState {
  return {
    ...state,
    phase: "reveal",
    robot: null,
    lastResult: result,
    history: [...state.history, result],
  };
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
    questionStartedAt: 0,
    deadline: 0,
    pausedAt: null,
    robot: null,
    lastResult: null,
    history: [],
    winner: null,
  };
}

function answer(state: MatchState, side: Side, value: number | string, now: number): MatchState {
  if (state.phase !== "question" || state.pausedAt !== null) return state;
  if (now >= state.deadline) return state; // too late; TICK will close the round
  const team = state.teams[side];
  if (now < team.lockedUntil) return state;

  const round = currentRound(state);
  if (isCorrect(round.answer, value)) {
    const p = state.config.pullsToWin;
    const rope = clampRope(state.rope + (side === "a" ? -1 : 1), p);
    const teams = { ...state.teams, [side]: { ...team, picked: null, correctTotal: team.correctTotal + 1 } };
    return endRound(
      { ...state, rope, teams },
      { roundId: round.id, winner: side, reason: "correct", timeMs: now - state.questionStartedAt },
    );
  }

  return {
    ...state,
    teams: {
      ...state.teams,
      [side]: {
        ...team,
        picked: null,
        lockedUntil: now + state.config.lockoutMs,
        wrongThisRound: team.wrongThisRound + 1,
      },
    },
  };
}

export function matchReducer(state: MatchState, action: MatchAction): MatchState {
  switch (action.type) {
    case "START":
      return state.phase === "ready" ? startQuestion(state, 0, action.now) : state;

    case "PICK": {
      if (state.phase !== "question" || state.pausedAt !== null) return state;
      const round = currentRound(state);
      if (round.answer.type !== "mcq" || action.index < 0 || action.index >= round.answer.options.length) {
        return state;
      }
      return { ...state, teams: { ...state.teams, [action.side]: { ...state.teams[action.side], picked: action.index } } };
    }

    case "ANSWER":
      // In solo mode Team B is the robot; people can't answer for it.
      if (state.config.mode === "solo" && action.side === "b") return state;
      return answer(state, action.side, action.value, action.now);

    case "TICK": {
      if (state.phase !== "question" || state.pausedAt !== null) return state;
      if (state.robot && action.now >= state.robot.at) {
        // The robot answers once per round, at its planned time. A plan past the deadline
        // means the robot was too slow this round.
        const plan = state.robot;
        let next: MatchState = { ...state, robot: null };
        if (plan.at < state.deadline) {
          const value = robotValue(currentRound(state).answer, plan.correct, state.config.seed + state.roundIndex);
          next = answer(next, "b", value, plan.at);
        }
        return next.phase === "question" ? matchReducer(next, action) : next;
      }
      if (action.now >= state.deadline) {
        return endRound(state, {
          roundId: currentRound(state).id,
          winner: null,
          reason: "timeout",
          timeMs: null,
        });
      }
      return state;
    }

    case "SKIP":
      if (state.phase !== "question") return state;
      return endRound(
        { ...state, pausedAt: null },
        { roundId: currentRound(state).id, winner: null, reason: "skipped", timeMs: null },
      );

    case "NEXT": {
      if (state.phase !== "reveal") return state;
      const p = state.config.pullsToWin;
      const isLast = state.roundIndex >= state.config.rounds.length - 1;
      if (Math.abs(state.rope) >= p || isLast) {
        const winner: Side | null = state.rope < 0 ? "a" : state.rope > 0 ? "b" : null;
        return { ...state, phase: "over", winner };
      }
      return startQuestion(state, state.roundIndex + 1, action.now);
    }

    case "PAUSE":
      if (state.phase !== "question" || state.pausedAt !== null) return state;
      return { ...state, pausedAt: action.now };

    case "RESUME": {
      if (state.pausedAt === null) return state;
      const gap = action.now - state.pausedAt;
      const shift = (t: number) => (t > state.pausedAt! ? t + gap : t);
      return {
        ...state,
        pausedAt: null,
        questionStartedAt: state.questionStartedAt + gap,
        deadline: state.deadline + gap,
        robot: state.robot ? { ...state.robot, at: state.robot.at + gap } : null,
        teams: {
          a: { ...state.teams.a, lockedUntil: shift(state.teams.a.lockedUntil) },
          b: { ...state.teams.b, lockedUntil: shift(state.teams.b.lockedUntil) },
        },
      };
    }

    case "RESTART":
      return createMatch(state.config);
  }
}

/** Has the match been decided by the rope (rather than by running out of rounds)? */
export function ropeDecided(state: MatchState) {
  return Math.abs(state.rope) >= state.config.pullsToWin;
}
