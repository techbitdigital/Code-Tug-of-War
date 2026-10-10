// Checks a round's reveal for the mistakes the Oct 10 playtest found: narration that
// disagrees with the panels, "changed" flags that don't match, runtime steps with
// nothing to show, and content too long for the stage. Used by `npm run validate:packs`.
import { buildRevealSteps } from "./reveal";
import type { Round } from "./types";

export interface LintIssue {
  level: "error" | "warning";
  where: string;
  message: string;
}

// "score becomes 2", "x = 6", "age holds 24", "i is now 3", "n is 5".
// The lookahead skips expressions such as "score = 0 + 2".
const CLAIM =
  /\b([A-Za-z_$][\w$]*)\s*(?:=|becomes|is now|holds|is)\s*(-?\d+(?:\.\d+)?|'[^']*'|"[^"]*"|true|false)(?!\w|\.\d|\s*[-+*/%<>=])/g;

export const LIMITS = { codeLines: 5, promptChars: 60, optionChars: 18 };

export function lintRound(round: Round): LintIssue[] {
  const issues: LintIssue[] = [];
  const steps = buildRevealSteps(round.reveal);

  steps.forEach((step, i) => {
    const where = `${round.id} step ${i + 1}`;

    // 1. Narration must agree with the memory panel.
    for (const match of step.frame.say.matchAll(CLAIM)) {
      const [, name, claimed] = match;
      const boxes = step.memory.filter((b) => b.name === name);
      if (boxes.length === 0) continue; // not a variable we show
      const value = claimed.replace(/^"(.*)"$/, "'$1'");
      const ok = boxes.some((b) => !b.uninitialized && (b.value === value || b.value === claimed));
      if (!ok) {
        const shown = boxes.map((b) => (b.uninitialized ? "not ready" : b.value)).join(", ");
        issues.push({ level: "error", where, message: `narration says ${name} is ${claimed}, but Memory shows ${name} = ${shown}` });
      }
    }

    // 2. "changed" should mark exactly the boxes whose value is new.
    const prev = i > 0 ? steps[i - 1].memory : [];
    for (const box of step.memory) {
      const before = prev.find((b) => b.name === box.name && b.scope === box.scope);
      const isNew = !before || before.value !== box.value || before.uninitialized !== box.uninitialized;
      if (step.frame.memory && isNew && !box.changed) {
        issues.push({ level: "warning", where, message: `${box.name} changed but isn't marked "changed"` });
      }
      if (step.frame.memory && !isNew && box.changed) {
        issues.push({ level: "warning", where, message: `${box.name} is marked "changed" but its value is the same` });
      }
    }

    // 3. A runtime step should show what the engine works out.
    if (step.frame.layer === "runtime" && step.eval.length === 0 && !step.frame.stack) {
      issues.push({ level: "warning", where, message: "runtime step has no eval or stack, so the Runtime panel would be empty" });
    }
  });

  // 4. Content that won't fit the stage comfortably.
  if (round.code && round.code.lines.length > LIMITS.codeLines) {
    issues.push({ level: "warning", where: round.id, message: `${round.code.lines.length} code lines (keep to ${LIMITS.codeLines} or fewer)` });
  }
  if (round.prompt.length > LIMITS.promptChars) {
    issues.push({ level: "warning", where: round.id, message: `prompt is ${round.prompt.length} characters (keep to ${LIMITS.promptChars})` });
  }
  if (round.answer.type === "mcq") {
    round.answer.options.forEach((o, i) => {
      if (o.length > LIMITS.optionChars) {
        issues.push({ level: "warning", where: `${round.id} option ${i + 1}`, message: `"${o}" is long for an answer button` });
      }
    });
    if (!round.answer.why) {
      issues.push({ level: "warning", where: round.id, message: 'no "why" for the wrong options' });
    }
  }
  return issues;
}
