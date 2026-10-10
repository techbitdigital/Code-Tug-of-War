import { describe, expect, it } from "vitest";
import { buildRevealSteps } from "./reveal";

describe("buildRevealSteps", () => {
  it("carries memory and stack forward when a frame leaves them out", () => {
    const steps = buildRevealSteps([
      { line: 0, layer: "memory", memory: [{ name: "x", value: "2", changed: true }], stack: ["global"], say: "a" },
      { line: 2, layer: "output", output: "2", say: "b" },
    ]);
    expect(steps[1].memory).toEqual([{ name: "x", value: "2", changed: false, scope: "global", uninitialized: false }]);
    expect(steps[1].stack).toEqual(["global"]);
  });

  it("replaces memory when a frame gives a new snapshot (a popped frame's variables vanish)", () => {
    const steps = buildRevealSteps([
      { line: 1, layer: "memory", memory: [{ name: "n", value: "5" }], say: "a" },
      { line: 3, layer: "memory", memory: [{ name: "result", value: "10", changed: true }], say: "b" },
    ]);
    expect(steps[1].memory.map((m) => m.name)).toEqual(["result"]);
  });

  it("adds up console output and flags the step that printed", () => {
    const steps = buildRevealSteps([
      { layer: "output", output: "1", say: "a" },
      { layer: "runtime", say: "b" },
      { layer: "output", output: "2", say: "c" },
    ]);
    expect(steps.map((s) => s.console)).toEqual([["1"], ["1"], ["1", "2"]]);
    expect(steps.map((s) => s.printed)).toEqual([true, false, true]);
  });

  it("keeps pointing at the last line when a frame has none", () => {
    const steps = buildRevealSteps([
      { line: 3, layer: "runtime", say: "a" },
      { layer: "output", output: "x", say: "b" },
    ]);
    expect(steps[1].line).toBe(3);
  });
});
