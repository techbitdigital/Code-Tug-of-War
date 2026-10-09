"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, Box, Code2, Cpu, Terminal } from "lucide-react";
import CodeCard from "@/components/match/CodeCard";
import { buildRevealSteps, type RevealStep } from "@/lib/reveal";
import { motionTokens } from "@/lib/motion";
import type { CodeBlock, RevealFrame } from "@/lib/types";

type Layer = RevealFrame["layer"];

// Top to bottom: each layer sits "beneath" the one above it.
const LAYERS: { id: Layer; title: string; hint: string; Icon: typeof Code2 }[] = [
  { id: "code", title: "Code", hint: "what you wrote", Icon: Code2 },
  { id: "runtime", title: "Runtime", hint: "what the engine does", Icon: Cpu },
  { id: "memory", title: "Memory", hint: "what is stored", Icon: Box },
  { id: "output", title: "Output", hint: "what you see", Icon: Terminal },
];

interface RevealProps {
  frames: RevealFrame[];
  code?: CodeBlock;
  /** Shown above the steps (in a match: who pulled and the answer). */
  header?: ReactNode;
  /** Label for the button on the last step. */
  finishLabel?: string;
  onFinish?: () => void;
  /** Colour of the finish button. */
  tone?: "accent" | "a" | "b";
}

const TONE = {
  accent: "bg-gradient-to-b from-[#8B5CF6] to-accent shadow-[0_5px_0_#5B21B6]",
  a: "bg-gradient-to-b from-team-a-bright to-team-a shadow-[0_5px_0_var(--team-a-deep)]",
  b: "bg-gradient-to-b from-team-b-bright to-team-b shadow-[0_5px_0_var(--team-b-deep)]",
} as const;

const FOCUS_RING = "focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-focus";

/**
 * "Beneath the line": steps through what one piece of code does, layer by layer.
 * Standalone on purpose: it only needs frames (and optionally the code), so it can
 * also run outside a match later (trace-first mode).
 */
export default function Reveal({ frames, code, header, finishLabel = "Done", onFinish, tone = "accent" }: RevealProps) {
  const steps = useMemo(() => buildRevealSteps(frames), [frames]);
  const [index, setIndex] = useState(0);
  const reduced = useReducedMotion() ?? false;
  const step = steps[index];
  const last = index === steps.length - 1;

  // On phones the reveal replaces the match in the page, so start it at the top.
  useEffect(() => {
    if (window.innerWidth < 768) window.scrollTo({ top: 0 });
  }, []);

  const next = () => (last ? onFinish?.() : setIndex((i) => i + 1));
  const back = () => setIndex((i) => Math.max(0, i - 1));

  // Arrow keys step through; Enter/Space are left to the focused button.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        e.preventDefault();
        setIndex((i) => Math.min(steps.length - 1, i + 1));
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        setIndex((i) => Math.max(0, i - 1));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [steps.length]);

  const codeFit = code ? Math.min(1, 560 / (28 * (0.6 * Math.max(...code.lines.map((l) => l.length)) + 2.2))) : 1;

  return (
    <motion.section
      aria-label="Beneath the line"
      initial={reduced ? false : { opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={motionTokens.settle}
      className="flex min-h-full flex-col overflow-hidden rounded-[var(--r-card)] bg-surface shadow-panel @3xl:h-full"
    >
      {header}

      <div className="grid min-h-0 flex-1 gap-[var(--pad)] p-[var(--pad)] @3xl:grid-cols-[1.08fr_1fr]">
        {/* Left: the code with the current line, and the bot explaining it */}
        <div className="flex min-h-0 flex-col gap-[var(--pad)]">
          {code && (
            <CodeCard code={{ ...code, focusLine: step.line ?? undefined }} fitW={codeFit} fitH={1} />
          )}
          <Narration step={step} index={index} total={steps.length} reduced={reduced} />
        </div>

        {/* Right: the layers beneath the line */}
        <LayerLadder step={step} code={code} reduced={reduced} />
      </div>

      <footer className="flex items-center justify-between gap-[var(--gap)] border-t border-line px-[var(--pad)] py-[calc(var(--gap)*1.1)]">
        <button
          type="button"
          onClick={back}
          disabled={index === 0}
          className={`inline-flex h-[calc(var(--pull-h)*0.85)] items-center gap-2 whitespace-nowrap rounded-[var(--r-key)] border-2 border-line bg-surface px-[var(--pad)] font-display text-[length:var(--fs-ui)] font-black text-ink shadow-key transition-[transform,box-shadow] active:translate-y-[3px] active:shadow-none disabled:opacity-40 ${FOCUS_RING}`}
        >
          <ArrowLeft className="size-[1.1em]" strokeWidth={3} aria-hidden="true" /> Back
        </button>

        <div className="flex items-center gap-[calc(var(--gap)*0.6)]" aria-label={`Step ${index + 1} of ${steps.length}`}>
          {steps.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Go to step ${i + 1}`}
              aria-current={i === index ? "step" : undefined}
              onClick={() => setIndex(i)}
              className={`h-[calc(var(--gap)*0.9)] rounded-full transition-all ${
                i === index ? "w-[calc(var(--gap)*2.6)] bg-accent" : i < index ? "w-[calc(var(--gap)*0.9)] bg-accent/40" : "w-[calc(var(--gap)*0.9)] bg-line"
              } ${FOCUS_RING}`}
            />
          ))}
        </div>

        <button
          type="button"
          autoFocus
          onClick={next}
          className={`inline-flex h-[calc(var(--pull-h)*0.85)] items-center gap-2 whitespace-nowrap rounded-[var(--r-key)] px-[calc(var(--pad)*1.2)] font-display text-[length:var(--fs-ui)] font-black text-white transition-[transform,box-shadow] active:translate-y-[4px] active:shadow-none ${
            last ? TONE[tone] : TONE.accent
          } ${FOCUS_RING}`}
        >
          {last ? finishLabel : "Next step"} <ArrowRight className="size-[1.1em]" strokeWidth={3} aria-hidden="true" />
        </button>
      </footer>
    </motion.section>
  );
}

function Narration({ step, index, total, reduced }: { step: RevealStep; index: number; total: number; reduced: boolean }) {
  return (
    <div className="flex min-h-0 flex-1 items-start gap-[var(--gap)]">
      <BotAvatar />
      <div className="relative flex min-h-[5.5em] flex-1 flex-col justify-center rounded-[var(--r-key)] bg-accent/8 px-[var(--pad)] py-[var(--gap)] @3xl:h-full">
        {/* speech-bubble tail */}
        <span className="absolute -left-[7px] top-[calc(var(--chip)*0.55)] size-[14px] rotate-45 bg-[#F4EFFE]" aria-hidden="true" />
        <p className="mb-1 text-[length:var(--fs-key)] font-extrabold uppercase tracking-[0.1em] text-accent @3xl:text-[length:var(--fs-ui)]">
          Step {index + 1} of {total}
        </p>
        <AnimatePresence mode="wait" initial={false}>
          <motion.p
            key={index}
            aria-live="polite"
            initial={reduced ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? undefined : { opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="text-[length:calc(var(--fs-option)*1.05)] font-bold leading-snug text-ink"
          >
            {step.frame.say}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
}

function LayerLadder({ step, code, reduced }: { step: RevealStep; code?: CodeBlock; reduced: boolean }) {
  const activeIdx = LAYERS.findIndex((l) => l.id === step.frame.layer);

  return (
    <ol className="relative flex min-h-0 flex-col gap-[calc(var(--gap)*0.8)]">
      {/* The rail: fills down to the active layer, showing how deep this step goes. */}
      <span
        className="absolute bottom-[calc(var(--chip)*0.5)] left-[calc(var(--chip)*0.5-2px)] top-[calc(var(--chip)*0.5)] w-1 rounded-full bg-line"
        aria-hidden="true"
      />
      <motion.span
        className="absolute left-[calc(var(--chip)*0.5-2px)] top-[calc(var(--chip)*0.5)] w-1 origin-top rounded-full bg-accent"
        style={{ height: "calc(100% - var(--chip))" }}
        initial={false}
        animate={{ scaleY: activeIdx / (LAYERS.length - 1) }}
        transition={reduced ? { duration: 0 } : motionTokens.settle}
        aria-hidden="true"
      />

      {LAYERS.map(({ id, title, hint, Icon }, i) => {
        const active = i === activeIdx;
        const passed = i < activeIdx;
        return (
          <li key={id} className={`relative flex gap-[var(--gap)] ${id === "memory" ? "flex-[1.4]" : "flex-1"} min-h-0`}>
            <span
              className={`relative z-10 flex size-[var(--chip)] shrink-0 items-center justify-center rounded-full transition-colors ${
                active ? "bg-accent text-white shadow-[0_0_0_5px_rgba(124,58,237,0.18)]" : passed ? "bg-accent/70 text-white" : "bg-surface text-ink-muted ring-2 ring-line"
              }`}
            >
              <Icon className="size-[50%]" strokeWidth={2.5} aria-hidden="true" />
            </span>
            <div
              aria-current={active ? "step" : undefined}
              className={`flex min-h-0 min-w-0 flex-1 flex-col gap-[calc(var(--gap)*0.5)] rounded-[var(--r-key)] border-2 px-[var(--gap)] py-[calc(var(--gap)*0.6)] transition-colors ${
                active ? "border-accent bg-accent/5" : "border-line bg-arena/50"
              }`}
            >
              <div className="flex items-baseline gap-2">
                <span className={`font-display text-[length:var(--fs-ui)] font-black uppercase tracking-[0.06em] ${active ? "text-accent" : "text-ink"}`}>
                  {title}
                </span>
                <span className="truncate text-[length:var(--fs-key)] font-bold text-ink-muted">{hint}</span>
              </div>
              <div className="min-h-0 flex-1">
                {id === "code" && <CodeLayer step={step} code={code} />}
                {id === "runtime" && <RuntimeLayer step={step} reduced={reduced} />}
                {id === "memory" && <MemoryLayer step={step} reduced={reduced} />}
                {id === "output" && <OutputLayer step={step} reduced={reduced} />}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function CodeLayer({ step, code }: { step: RevealStep; code?: CodeBlock }) {
  const text = code && step.line !== null ? code.lines[step.line]?.trim() : null;
  return text ? (
    <p className="truncate font-mono text-[length:var(--fs-ui)] font-semibold text-ink">
      <span className="mr-2 text-ink-muted">line {step.line! + 1}</span>
      {text}
    </p>
  ) : (
    <p className="text-[length:var(--fs-ui)] font-semibold text-ink-muted">–</p>
  );
}

function RuntimeLayer({ step, reduced }: { step: RevealStep; reduced: boolean }) {
  if (step.stack.length === 0) {
    return (
      <p className="text-[length:var(--fs-ui)] font-semibold text-ink-muted">
        {step.line !== null ? `Running line ${step.line + 1}` : "Waiting"}
      </p>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-[calc(var(--gap)*0.5)]">
      <span className="text-[length:var(--fs-key)] font-bold text-ink-muted">call stack, top first:</span>
      <AnimatePresence initial={false} mode="popLayout">
        {step.stack.map((frame, i) => (
          <motion.span
            key={`${frame}-${step.stack.length - i}`}
            layout={!reduced}
            initial={reduced ? false : { opacity: 0, y: -10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduced ? undefined : { opacity: 0, y: -10, scale: 0.9 }}
            transition={motionTokens.snap}
            className={`rounded-[calc(var(--r-key)*0.6)] px-2 py-0.5 font-mono text-[length:var(--fs-ui)] font-bold ${
              i === 0 ? "bg-accent text-white" : "bg-line text-ink"
            }`}
          >
            {frame}
          </motion.span>
        ))}
      </AnimatePresence>
    </div>
  );
}

function MemoryLayer({ step, reduced }: { step: RevealStep; reduced: boolean }) {
  if (step.memory.length === 0) {
    return <p className="text-[length:var(--fs-ui)] font-semibold text-ink-muted">Nothing stored yet</p>;
  }
  return (
    <div className="flex flex-wrap gap-[var(--gap)]">
      <AnimatePresence initial={false} mode="popLayout">
        {step.memory.map((box) => (
          <motion.div
            key={box.name}
            layout={!reduced}
            initial={reduced ? false : { opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={reduced ? undefined : { opacity: 0, scale: 0.6 }}
            transition={motionTokens.snap}
            className="flex flex-col items-center gap-0.5"
          >
            <span className="font-mono text-[length:var(--fs-key)] font-bold text-ink-muted">{box.name}</span>
            <motion.span
              key={box.value}
              initial={reduced || !box.changed ? false : { scale: 1.35, rotate: -4 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={motionTokens.pull}
              className={`flex min-w-[calc(var(--chip)*1.6)] items-center justify-center rounded-[calc(var(--r-key)*0.7)] border-2 px-[var(--gap)] py-[calc(var(--gap)*0.4)] font-mono text-[length:var(--fs-option)] font-bold ${
                box.changed ? "border-focus bg-[#FEF9C3] text-ink shadow-[0_3px_0_#EAB308]" : "border-line bg-surface text-ink shadow-key"
              }`}
            >
              {box.value}
            </motion.span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

function OutputLayer({ step, reduced }: { step: RevealStep; reduced: boolean }) {
  return (
    <div className="flex h-full min-h-[2.2em] flex-col justify-end overflow-hidden rounded-[calc(var(--r-key)*0.7)] bg-code-bg px-[var(--gap)] py-[calc(var(--gap)*0.4)] font-mono text-[length:var(--fs-ui)] font-semibold text-code-ink">
      {step.console.length === 0 ? (
        <span className="text-code-ink/40">nothing printed yet</span>
      ) : (
        step.console.slice(-3).map((line, i, shown) => {
          const newest = step.printed && i === shown.length - 1;
          return (
            <motion.span
              key={`${step.console.length - shown.length + i}-${line}`}
              initial={reduced || !newest ? false : { opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              className={newest ? "text-code-str" : ""}
            >
              <span className="text-code-ink/40">&gt; </span>
              {line}
            </motion.span>
          );
        })
      )}
    </div>
  );
}

function BotAvatar() {
  return (
    <svg viewBox="0 0 40 40" aria-hidden="true" className="size-[calc(var(--chip)*1.3)] shrink-0">
      <circle cx="20" cy="20" r="19" fill="var(--accent)" />
      <line x1="20" y1="7" x2="21" y2="3" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
      <circle cx="21" cy="3.5" r="2.5" fill="var(--focus)" />
      <rect x="8" y="9" width="24" height="21" rx="7" fill="#fff" />
      <rect x="12" y="14" width="16" height="9" rx="4.5" fill="var(--ink)" />
      <circle cx="16.5" cy="18.5" r="1.8" fill="#5EEAD4" />
      <circle cx="23.5" cy="18.5" r="1.8" fill="#5EEAD4" />
    </svg>
  );
}
