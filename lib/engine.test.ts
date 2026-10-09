import { describe, expect, it } from "vitest";
import { createMatch, DEFAULT_CONFIG, isCorrect, matchReducer, type MatchAction, type MatchConfig, type MatchState } from "./engine";
import type { Round } from "./types";

const mcq = (id: string, correctIndex = 1): Round => ({
  id,
  concept: "test",
  prompt: "What is it?",
  answer: { type: "mcq", options: ["w", "x", "y", "z"], correctIndex },
  reveal: [{ layer: "code", say: "Because." }],
});

const text = (id: string, accept: string[]): Round => ({
  id,
  concept: "test",
  prompt: "Type it",
  answer: { type: "text", accept },
  reveal: [{ layer: "code", say: "Because." }],
});

function setup(overrides: Partial<MatchConfig> = {}, rounds = [mcq("r1"), mcq("r2"), mcq("r3")]) {
  return createMatch({ ...DEFAULT_CONFIG, rounds, ...overrides });
}

const run = (state: MatchState, ...actions: MatchAction[]) => actions.reduce(matchReducer, state);

describe("isCorrect", () => {
  it("checks the option index for multiple choice", () => {
    expect(isCorrect(mcq("r").answer, 1)).toBe(true);
    expect(isCorrect(mcq("r").answer, 0)).toBe(false);
  });
  it("ignores case and extra spaces in typed answers unless caseSensitive", () => {
    expect(isCorrect(text("t", ["Hello World"]).answer, "  hello   world ")).toBe(true);
    expect(isCorrect({ type: "text", accept: ["Hi"], caseSensitive: true }, "hi")).toBe(false);
  });
});

describe("match flow", () => {
  it("starts on the first question with a deadline", () => {
    const s = run(setup(), { type: "START", now: 1000 });
    expect(s.phase).toBe("question");
    expect(s.roundIndex).toBe(0);
    expect(s.deadline).toBe(1000 + DEFAULT_CONFIG.defaultTimeLimitSec * 1000);
  });

  it("uses the round's own time limit when it has one", () => {
    const s = run(setup({}, [{ ...mcq("r1"), timeLimitSec: 10 }]), { type: "START", now: 0 });
    expect(s.deadline).toBe(10_000);
  });

  it("first correct answer pulls the rope toward that team and ends the round", () => {
    const s = run(setup(), { type: "START", now: 0 }, { type: "ANSWER", side: "a", value: 1, now: 4200 });
    expect(s.rope).toBe(-1);
    expect(s.phase).toBe("reveal");
    expect(s.lastResult).toMatchObject({ winner: "a", reason: "correct", timeMs: 4200 });
  });

  it("ignores the second team once the round is won", () => {
    const s = run(
      setup(),
      { type: "START", now: 0 },
      { type: "ANSWER", side: "b", value: 1, now: 100 },
      { type: "ANSWER", side: "a", value: 1, now: 101 },
    );
    expect(s.rope).toBe(1);
    expect(s.lastResult?.winner).toBe("b");
  });

  it("a wrong answer locks that team out for lockoutMs, but not the other team", () => {
    let s = run(setup({ lockoutMs: 3000 }), { type: "START", now: 0 }, { type: "ANSWER", side: "a", value: 0, now: 1000 });
    expect(s.phase).toBe("question");
    expect(s.teams.a.lockedUntil).toBe(4000);
    expect(s.teams.a.wrongThisRound).toBe(1);

    s = matchReducer(s, { type: "ANSWER", side: "a", value: 1, now: 3999 }); // still locked
    expect(s.phase).toBe("question");
    s = matchReducer(s, { type: "ANSWER", side: "a", value: 1, now: 4000 }); // free again
    expect(s.lastResult?.winner).toBe("a");
  });

  it("times out with no winner when nobody answers", () => {
    const s = run(setup(), { type: "START", now: 0 }, { type: "TICK", now: 30_000 });
    expect(s.phase).toBe("reveal");
    expect(s.rope).toBe(0);
    expect(s.lastResult).toMatchObject({ winner: null, reason: "timeout" });
  });

  it("rejects answers at or after the deadline", () => {
    const s = run(setup(), { type: "START", now: 0 }, { type: "ANSWER", side: "a", value: 1, now: 30_000 });
    expect(s.rope).toBe(0);
  });

  it("host skip ends the round without a pull", () => {
    const s = run(setup(), { type: "START", now: 0 }, { type: "SKIP", now: 5 });
    expect(s.lastResult).toMatchObject({ winner: null, reason: "skipped" });
    expect(s.rope).toBe(0);
  });

  it("NEXT moves to the next round and resets picks and lockouts", () => {
    const s = run(
      setup(),
      { type: "START", now: 0 },
      { type: "PICK", side: "b", index: 2 },
      { type: "ANSWER", side: "b", value: 0, now: 10 },
      { type: "ANSWER", side: "a", value: 1, now: 20 },
      { type: "NEXT", now: 5000 },
    );
    expect(s.phase).toBe("question");
    expect(s.roundIndex).toBe(1);
    expect(s.teams.b.lockedUntil).toBe(0);
    expect(s.teams.b.picked).toBeNull();
    expect(s.deadline).toBe(5000 + 30_000);
  });

  it("ends the match as soon as the rope reaches pullsToWin", () => {
    let s = run(setup({ pullsToWin: 3 }, [mcq("1"), mcq("2"), mcq("3"), mcq("4"), mcq("5")]), { type: "START", now: 0 });
    for (let i = 0; i < 3; i++) {
      s = run(s, { type: "ANSWER", side: "b", value: 1, now: i * 100 + 1 }, { type: "NEXT", now: i * 100 + 50 });
    }
    expect(s.phase).toBe("over");
    expect(s.winner).toBe("b");
    expect(s.rope).toBe(3);
  });

  it("when the rounds run out, the side the rope leans to wins; dead centre is a draw", () => {
    let s = run(setup({}, [mcq("1"), mcq("2")]), { type: "START", now: 0 });
    s = run(s, { type: "ANSWER", side: "a", value: 1, now: 1 }, { type: "NEXT", now: 2 });
    s = run(s, { type: "ANSWER", side: "a", value: 1, now: 3 }, { type: "NEXT", now: 4 });
    expect(s).toMatchObject({ phase: "over", winner: "a" });

    let d = run(setup({}, [mcq("1"), mcq("2")]), { type: "START", now: 0 });
    d = run(d, { type: "ANSWER", side: "a", value: 1, now: 1 }, { type: "NEXT", now: 2 });
    d = run(d, { type: "ANSWER", side: "b", value: 1, now: 3 }, { type: "NEXT", now: 4 });
    expect(d).toMatchObject({ phase: "over", winner: null });
  });

  it("RESTART goes back to the ready screen with the same config", () => {
    const s = run(setup(), { type: "START", now: 0 }, { type: "ANSWER", side: "a", value: 1, now: 1 }, { type: "RESTART" });
    expect(s).toMatchObject({ phase: "ready", rope: 0, history: [] });
  });
});

describe("pause", () => {
  it("freezes answers and the clock, then shifts deadline and lockouts on resume", () => {
    let s = run(
      setup({ lockoutMs: 3000 }),
      { type: "START", now: 0 },
      { type: "ANSWER", side: "a", value: 0, now: 1000 }, // locked until 4000
      { type: "PAUSE", now: 2000 },
      { type: "ANSWER", side: "b", value: 1, now: 2500 }, // ignored while paused
      { type: "TICK", now: 60_000 }, // would time out, but paused
    );
    expect(s.phase).toBe("question");
    expect(s.rope).toBe(0);

    s = matchReducer(s, { type: "RESUME", now: 12_000 }); // paused for 10s
    expect(s.deadline).toBe(40_000);
    expect(s.teams.a.lockedUntil).toBe(14_000);
  });
});

describe("solo robot", () => {
  const solo = (accuracy: number) =>
    setup({ mode: "solo", robotAccuracy: accuracy, robotDelayMs: [5000, 5000], lockoutMs: 2000 });

  it("people can't answer for the robot", () => {
    const s = run(solo(1), { type: "START", now: 0 }, { type: "ANSWER", side: "b", value: 1, now: 10 });
    expect(s.phase).toBe("question");
  });

  it("an always-right robot pulls at its planned time", () => {
    const s = run(solo(1), { type: "START", now: 0 }, { type: "TICK", now: 4999 }, { type: "TICK", now: 5000 });
    expect(s.lastResult).toMatchObject({ winner: "b", reason: "correct", timeMs: 5000 });
  });

  it("an always-wrong robot gets locked out and the player can still win", () => {
    let s = run(solo(0), { type: "START", now: 0 }, { type: "TICK", now: 5000 });
    expect(s.phase).toBe("question");
    expect(s.teams.b.wrongThisRound).toBe(1);
    s = matchReducer(s, { type: "ANSWER", side: "a", value: 1, now: 6000 });
    expect(s.lastResult?.winner).toBe("a");
  });

  it("the player beats the robot by answering first", () => {
    const s = run(solo(1), { type: "START", now: 0 }, { type: "ANSWER", side: "a", value: 1, now: 3000 }, { type: "TICK", now: 5000 });
    expect(s.lastResult?.winner).toBe("a");
    expect(s.rope).toBe(-1);
  });

  it("is deterministic for the same seed", () => {
    const a = run(setup({ mode: "solo", seed: 42 }), { type: "START", now: 0 });
    const b = run(setup({ mode: "solo", seed: 42 }), { type: "START", now: 0 });
    expect(a.robot).toEqual(b.robot);
  });
});
