// Turns a round's reveal frames into the full picture at each step.
// Authors only write what changes; a frame that leaves out memory, stack or output
// keeps whatever the previous step showed (memory and stack carry over, output lines add up).
import type { RevealFrame } from "./types";

export interface MemoryBox {
  name: string;
  value: string;
  changed: boolean;
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
}

export function buildRevealSteps(frames: RevealFrame[]): RevealStep[] {
  const steps: RevealStep[] = [];
  let memory: MemoryBox[] = [];
  let stack: string[] = [];
  let lastLine: number | null = null;
  const console: string[] = [];

  for (const frame of frames) {
    memory = frame.memory
      ? frame.memory.map((m) => ({ name: m.name, value: m.value, changed: m.changed ?? false }))
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
    });
  }
  return steps;
}
