import { describe, expect, it } from "vitest";
import {
  createMatch,
  DEFAULT_CONFIG,
  isCorrect,
  matchReducer,
  type MatchAction,
  type MatchConfig,
  type MatchState,
} from "./engine";
import type { Round } from "./types";

// correct option is index 1
const mcq = (id: string): Round => ({
  id,
  concept: "test",
  prompt: "What is it?",
  answer: { type: "mcq", options: ["w", "x", "y", "z"], correctIndex: 1 },
  reveal: [{ layer: "code", say: "Because." }],
});

function setup(overrides: Partial<MatchConfig> = {}, rounds = [mcq("r1"), mcq("r2"), mcq("r3"), mcq("r4")]) {
  return createMatch({ ...DEFAULT_CONFIG, countdownMs: 0, rounds, ...overrides });
}

const run = (state: MatchState, ...actions: MatchAction[]) => actions.reduce(matchReducer, state);
const started = (overrides: Partial<MatchConfig> = {}, rounds?: Round[]) =>
  run(setup(overrides, rounds), { type: "START", now: 0 });
const ans = (side: "a" | "b", value: number, now: number): MatchAction => ({ type: "ANSWER", side, value, now });

describe("isCorrect", () => {
  it("checks the option index for multiple choice", () => {
    expect(isCorrect(mcq("r").answer, 1)).toBe(true);
    expect(isCorrect(mcq("r").answer, 0)).toBe(false);
  });
  it("ignores case and extra spaces in typed answers unless caseSensitive", () => {
    expect(isCorrect({ type: "text", accept: ["Hello World"] }, "  hello   world ")).toBe(true);
    expect(isCorrect({ type: "text", accept: ["Hi"], caseSensitive: true }, "hi")).toBe(false);
  });
});

describe("start", () => {
  it("runs a countdown before the first question", () => {
    let s = run(setup({ countdownMs: 3000 }), { type: "START", now: 1000 });
    expect(s.phase).toBe("countdown");
    s = matchReducer(s, { type: "TICK", now: 3999 });
    expect(s.phase).toBe("countdown");
    s = matchReducer(s, { type: "TICK", now: 4050 });
    expect(s.phase).toBe("question");
    expect(s.questionStartedAt).toBe(4000); // starts exactly when the countdown ends
    expect(s.deadline).toBe(4000 + 30_000);
  });

  it("uses the round's own time limit when it has one", () => {
    const s = started({}, [{ ...mcq("r1"), timeLimitSec: 10 }]);
    expect(s.deadline).toBe(10_000);
  });
});

describe("one locked answer per team (fairness)", () => {
  it("locks the answer without ending the round or revealing right/wrong", () => {
    const s = run(started(), ans("a", 0, 1000));
    expect(s.phase).toBe("question");
    expect(s.teams.a.locked).toMatchObject({ value: 0, timeMs: 1000 });
    expect(s.lastResult).toBeNull();
  });

  it("ignores a second answer from the same team (no guessing every option)", () => {
    const s = run(started(), ans("a", 0, 1000), ans("a", 1, 2000), { type: "TICK", now: 30_000 });
    expect(s.teams.a.locked?.value).toBe(0);
    expect(s.lastResult).toMatchObject({ winner: null, reason: "none-correct" });
  });

  it("ignores picks after locking in", () => {
    const s = run(started(), { type: "PICK", side: "a", index: 2 }, ans("a", 2, 10), { type: "PICK", side: "a", index: 3 });
    expect(s.teams.a.picked).toBe(2);
  });
});

describe("resolving a round", () => {
  it("ends as soon as both teams lock in", () => {
    const s = run(started(), ans("a", 0, 1000), ans("b", 1, 2000));
    expect(s.phase).toBe("reveal");
    expect(s.lastResult).toMatchObject({ winner: "b", reason: "only-correct" });
    expect(s.rope).toBe(1);
  });

  it("the only correct team pulls even if it was slower", () => {
    const s = run(started(), ans("b", 0, 100), ans("a", 1, 9000));
    expect(s.lastResult).toMatchObject({ winner: "a", reason: "only-correct" });
    expect(s.rope).toBe(-1);
  });

  it("if both are right, the faster team pulls", () => {
    const s = run(started(), ans("b", 1, 4000), ans("a", 1, 2500));
    expect(s.lastResult).toMatchObject({ winner: "a", reason: "faster" });
  });

  it("an exact tie is no pull", () => {
    const s = run(started(), ans("a", 1, 3000), ans("b", 1, 3000));
    expect(s.lastResult?.winner).toBeNull();
    expect(s.rope).toBe(0);
  });

  it("if nobody is right, nobody pulls", () => {
    const s = run(started(), ans("a", 0, 10), ans("b", 2, 20));
    expect(s.lastResult).toMatchObject({ winner: null, reason: "none-correct" });
  });

  it("on timeout, uses whatever was locked in", () => {
    const s = run(started(), ans("a", 1, 5000), { type: "TICK", now: 29_999 }, { type: "TICK", now: 30_000 });
    expect(s.lastResult).toMatchObject({ winner: "a", reason: "only-correct" });
    expect(s.lastResult?.answers.b).toBeNull();
  });

  it("times out with no answers", () => {
    const s = run(started(), { type: "TICK", now: 30_000 });
    expect(s.lastResult).toMatchObject({ winner: null, reason: "no-answers" });
  });

  it("rejects answers at or after the deadline", () => {
    const s = run(started(), ans("a", 1, 30_000));
    expect(s.teams.a.locked).toBeNull();
  });

  it("the host can close the round early", () => {
    const s = run(started(), ans("a", 1, 100), { type: "CLOSE", now: 200 });
    expect(s.lastResult).toMatchObject({ winner: "a" });
    const empty = run(started(), { type: "CLOSE", now: 200 });
    expect(empty.lastResult?.reason).toBe("closed");
  });

  it("records both answers for the reveal and keeps running totals", () => {
    const s = run(started(), ans("a", 2, 1000), ans("b", 1, 2000));
    expect(s.lastResult?.answers).toEqual({
      a: { value: 2, correct: false, timeMs: 1000 },
      b: { value: 1, correct: true, timeMs: 2000 },
    });
    expect(s.teams.a).toMatchObject({ wrongTotal: 1, correctTotal: 0 });
    expect(s.teams.b).toMatchObject({ wrongTotal: 0, correctTotal: 1 });
  });
});

describe("rope distance win rule", () => {
  it("NEXT moves on and clears picks and locks", () => {
    const s = run(started(), { type: "PICK", side: "b", index: 2 }, ans("a", 1, 10), ans("b", 2, 20), { type: "NEXT", now: 5000 });
    expect(s).toMatchObject({ phase: "question", roundIndex: 1, deadline: 35_000 });
    expect(s.teams.a.locked).toBeNull();
    expect(s.teams.b.picked).toBeNull();
  });

  it("ends early when the rope reaches pullsToWin", () => {
    let s = started({ pullsToWin: 3 }, [mcq("1"), mcq("2"), mcq("3"), mcq("4"), mcq("5")]);
    for (let i = 0; i < 3; i++) {
      const t = i * 100;
      s = run(s, ans("b", 1, t + 1), ans("a", 0, t + 2), { type: "NEXT", now: t + 50 });
    }
    expect(s).toMatchObject({ phase: "over", winner: "b", rope: 3 });
  });

  it("a pull for the other team takes the rope back (1-1 is level)", () => {
    let s = started();
    s = run(s, ans("a", 1, 1), ans("b", 0, 2), { type: "NEXT", now: 3 });
    s = run(s, ans("b", 1, 4), ans("a", 0, 5));
    expect(s.rope).toBe(0);
  });

  it("when the questions run out, the side the rope leans to wins; centre is a draw", () => {
    let s = started({}, [mcq("1"), mcq("2")]);
    s = run(s, ans("a", 1, 1), ans("b", 0, 2), { type: "NEXT", now: 3 });
    s = run(s, ans("a", 0, 4), ans("b", 0, 5), { type: "NEXT", now: 6 });
    expect(s).toMatchObject({ phase: "over", winner: "a" });

    let d = started({}, [mcq("1"), mcq("2")]);
    d = run(d, ans("a", 1, 1), ans("b", 0, 2), { type: "NEXT", now: 3 });
    d = run(d, ans("b", 1, 4), ans("a", 0, 5), { type: "NEXT", now: 6 });
    expect(d).toMatchObject({ phase: "over", winner: null });
  });

  it("RESTART goes back to the ready screen", () => {
    const s = run(started(), ans("a", 1, 1), ans("b", 1, 2), { type: "RESTART" });
    expect(s).toMatchObject({ phase: "ready", rope: 0, history: [] });
  });
});

describe("pause", () => {
  it("freezes answers and the clock, then shifts the deadline on resume", () => {
    let s = run(
      started(),
      { type: "PAUSE", now: 2000 },
      ans("b", 1, 2500), // ignored while paused
      { type: "TICK", now: 60_000 }, // would time out, but paused
    );
    expect(s.phase).toBe("question");
    expect(s.teams.b.locked).toBeNull();
    s = matchReducer(s, { type: "RESUME", now: 12_000 }); // paused for 10s
    expect(s.deadline).toBe(40_000);
  });

  it("can pause the countdown", () => {
    let s = run(setup({ countdownMs: 3000 }), { type: "START", now: 0 }, { type: "PAUSE", now: 1000 }, { type: "TICK", now: 9000 });
    expect(s.phase).toBe("countdown");
    s = run(s, { type: "RESUME", now: 9000 }, { type: "TICK", now: 11_000 });
    expect(s.phase).toBe("question");
  });
});

describe("solo robot", () => {
  const solo = (accuracy: number) => started({ mode: "solo", robotAccuracy: accuracy, robotDelayMs: [5000, 5000] });

  it("people can't answer for the robot", () => {
    const s = run(solo(1), ans("b", 1, 10));
    expect(s.teams.b.locked).toBeNull();
  });

  it("the robot locks in at its planned time; the round waits for the player", () => {
    const s = run(solo(1), { type: "TICK", now: 5000 });
    expect(s.phase).toBe("question");
    expect(s.teams.b.locked).toMatchObject({ correct: true, timeMs: 5000 });
  });

  it("when the player locks in, the robot's planned answer counts and the round closes at once", () => {
    const fast = run(solo(1), ans("a", 1, 3000));
    expect(fast.lastResult).toMatchObject({ winner: "a", reason: "faster" });
    const slow = run(solo(1), ans("a", 1, 8000));
    expect(slow.lastResult).toMatchObject({ winner: "b", reason: "faster" });
  });

  it("a wrong robot lets a right player pull", () => {
    const s = run(solo(0), { type: "TICK", now: 5000 }, ans("a", 1, 9000));
    expect(s.lastResult).toMatchObject({ winner: "a", reason: "only-correct" });
  });

  it("is deterministic for the same seed", () => {
    const a = started({ mode: "solo", seed: 42 });
    const b = started({ mode: "solo", seed: 42 });
    expect(a.robot).toEqual(b.robot);
  });
});
