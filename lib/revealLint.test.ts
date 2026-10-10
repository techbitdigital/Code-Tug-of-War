import { describe, expect, it } from "vitest";
import { lintRound } from "./revealLint";
import { getPacks } from "./packs";
import type { Round } from "./types";

const base = (reveal: Round["reveal"]): Round => ({
  id: "t",
  concept: "c",
  prompt: "What does this print?",
  code: { lang: "js", lines: ["let i = 0;", "i = 3;"] },
  answer: { type: "mcq", options: ["1", "2"], correctIndex: 0, why: ["", "no"] },
  reveal,
});

describe("lintRound", () => {
  it("flags narration that disagrees with Memory (the playtest's i = 3 bug)", () => {
    const issues = lintRound(
      base([{ line: 1, layer: "memory", memory: [{ name: "i", value: "2", changed: true }], say: "i becomes 3 and the loop stops." }]),
    );
    expect(issues).toContainEqual(expect.objectContaining({ level: "error" }));
  });

  it("ignores expressions like score = 0 + 2", () => {
    const issues = lintRound(
      base([{ layer: "memory", memory: [{ name: "score", value: "2", changed: true }], say: "score = 0 + 2, so score becomes 2." }]),
    );
    expect(issues.filter((i) => i.level === "error")).toEqual([]);
  });

  it("flags a claim about a box that isn't ready yet", () => {
    const issues = lintRound(
      base([{ layer: "memory", memory: [{ name: "age", value: "", uninitialized: true, changed: true }], say: "age is 24." }]),
    );
    expect(issues.some((i) => i.level === "error")).toBe(true);
  });

  it("warns about runtime steps with nothing to show", () => {
    const issues = lintRound(base([{ line: 0, layer: "runtime", say: "Runs." }]));
    expect(issues.some((i) => i.message.includes("Runtime panel"))).toBe(true);
  });

  it("the shipped packs have no errors or warnings", () => {
    const all = getPacks().flatMap((p) => p.rounds.flatMap(lintRound));
    expect(all).toEqual([]);
  });
});
