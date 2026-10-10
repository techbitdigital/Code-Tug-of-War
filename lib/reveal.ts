// Turns a round's reveal frames into the full picture at each step.
// Authors only write what changes; a frame that leaves out memory, stack or output
// keeps whatever the previous step showed (memory and stack carry over, output lines add up).
import type { RevealFrame } from "./types";

export interface MemoryBox {
  name: string;
  value: string;
  changed: boolean;
  /** Box group: "global", a call frame like "double(5)", or "loop". */
  scope: string;
  /** Declared but not ready yet (temporal dead zone). */
  uninitialized: boolean;
}

export interface RevealStep {
  frame: RevealFrame;
  /** Code line this step points at, if any (0-indexed). */
  line: number | null;
  memory: MemoryBox[];
  /** Top of the call stack first. */
  stack: string[];
  /** Everything printed so far, oldest first. */
  console: string[];
  /** True when this step printed something new. */
  printed: boolean;
  /** What the engine works out on this step (not carried over). */
  eval: string[];
}

export function buildRevealSteps(frames: RevealFrame[]): RevealStep[] {
  const steps: RevealStep[] = [];
  let memory: MemoryBox[] = [];
  let stack: string[] = [];
  let lastLine: number | null = null;
  const console: string[] = [];

  for (const frame of frames) {
    memory = frame.memory
      ? frame.memory.map((m) => ({
          name: m.name,
          value: m.value,
          changed: m.changed ?? false,
          scope: m.scope ?? "global",
          uninitialized: m.uninitialized ?? false,
        }))
      : memory.map((m) => ({ ...m, changed: false }));
    if (frame.stack) stack = frame.stack;
    if (frame.output !== undefined) console.push(frame.output);
    if (frame.line !== undefined) lastLine = frame.line;

    steps.push({
      frame,
      line: frame.line ?? lastLine,
      memory,
      stack,
      console: [...console],
      printed: frame.output !== undefined,
      eval: frame.eval ?? [],
    });
  }
  return steps;
}

/** Boxes grouped by scope, in the order the scopes first appear. */
export function groupByScope(memory: MemoryBox[]): { scope: string; boxes: MemoryBox[] }[] {
  const groups: { scope: string; boxes: MemoryBox[] }[] = [];
  for (const box of memory) {
    let group = groups.find((g) => g.scope === box.scope);
    if (!group) groups.push((group = { scope: box.scope, boxes: [] }));
    group.boxes.push(box);
  }
  return groups;
}
