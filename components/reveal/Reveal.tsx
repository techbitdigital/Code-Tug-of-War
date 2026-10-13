"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, Box, Code2, Cpu, FastForward, Terminal, X } from "lucide-react";
import CodeCard from "@/components/match/CodeCard";
import { buildRevealSteps, groupByScope, type RevealStep } from "@/lib/reveal";
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
  /** An extra last step after the frames (in a match: what each team said, and why not). */
  epilogue?: { title: string; content: ReactNode };
  /** Shows an X (and closes on Escape), e.g. when replaying from the results. */
  onClose?: () => void;
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
export default function Reveal({
  frames,
  code,
  header,
  finishLabel = "Done",
  onFinish,
  tone = "accent",
  epilogue,
  onClose,
}: RevealProps) {
  const steps = useMemo(() => buildRevealSteps(frames), [frames]);
  const total = steps.length + (epilogue ? 1 : 0);
  const [index, setIndex] = useState(0);
  const reduced = useReducedMotion() ?? false;
  const onEpilogue = epilogue !== undefined && index === steps.length;
  // The epilogue keeps showing the final state of the layers.
  const step = steps[Math.min(index, steps.length - 1)];
  const last = index === total - 1;

  // On phones the reveal replaces the match in the page, so start it at the top.
  useEffect(() => {
    if (window.innerWidth < 768) window.scrollTo({ top: 0 });
  }, []);

  const next = () => (last ? onFinish?.() : setIndex((i) => i + 1));
  const back = () => setIndex((i) => Math.max(0, i - 1));

  // Repeating steps (a loop) can be skipped: jump to the first step after the group.
  const group = onEpilogue ? undefined : step.frame.group;
  const groupEnd = group ? steps.findIndex((s, i) => i > index && s.frame.group !== group) : -1;
  const skipTo = groupEnd > index + 1 ? groupEnd : -1;

  // Arrow keys step through; Enter/Space are left to the focused button.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && onClose) {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setIndex((i) => Math.min(total - 1, i + 1));
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        setIndex((i) => Math.max(0, i - 1));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [total, onClose]);

  const codeFit = code ? Math.min(1, 560 / (28 * (0.6 * Math.max(...code.lines.map((l) => l.length)) + 2.2))) : 1;

  return (
    <motion.section
      aria-label="Beneath the line"
      initial={reduced ? false : { opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={motionTokens.settle}
      className="relative flex min-h-full flex-col overflow-hidden rounded-[var(--r-card)] bg-surface shadow-panel @3xl:h-full"
    >
      {header}
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Close (Esc)"
          title="Close (Esc)"
          className={`absolute right-[calc(var(--gap)*0.8)] top-[calc(var(--gap)*0.8)] z-10 flex size-[calc(var(--chip)*1.1)] items-center justify-center rounded-full bg-white text-ink shadow-panel transition-transform hover:scale-105 active:scale-95 ${FOCUS_RING}`}
        >
          <X className="size-[55%]" strokeWidth={3} aria-hidden="true" />
        </button>
      )}

      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)] gap-[var(--pad)] p-[var(--pad)] @3xl:grid-cols-[minmax(0,1.08fr)_minmax(0,1fr)]">
        {/* Left: the code with the current line, and the bot explaining it */}
        <div className="flex min-h-0 flex-col gap-[var(--pad)]">
          {code && (
            <CodeCard code={{ ...code, focusLine: step.line ?? undefined }} fitW={codeFit} fitH={1} />
          )}
          {onEpilogue ? (
            <div className="flex min-h-0 flex-1 flex-col gap-[var(--gap)] overflow-y-auto rounded-[var(--r-key)] bg-arena p-[var(--pad)]">
              <p className="text-[length:var(--fs-ui)] font-extrabold uppercase tracking-[0.1em] text-accent">{epilogue.title}</p>
              {epilogue.content}
            </div>
          ) : (
            <Narration
              step={step}
              index={index}
              total={steps.length}
              reduced={reduced}
              skip={skipTo > 0 ? { label: `Skip to end of ${group}`, onClick: () => setIndex(skipTo) } : undefined}
            />
          )}
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
          <ArrowLeft className="size-[1.1em]" strokeWidth={3} aria-hidden="true" />
          <span className="sr-only @3xl:not-sr-only">Back</span>
        </button>

        {/* Click any dot to jump straight to that step. */}
        <div className="flex min-w-0 flex-wrap items-center justify-center gap-[5px] @3xl:gap-[calc(var(--gap)*0.6)]" aria-label={`Step ${index + 1} of ${total}`}>
          {Array.from({ length: total }, (_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Go to step ${i + 1}`}
              aria-current={i === index ? "step" : undefined}
              onClick={() => setIndex(i)}
              title={`Step ${i + 1}`}
              className={`relative h-[10px] rounded-full transition-all before:absolute before:-inset-[6px] before:content-[''] @3xl:h-[calc(var(--gap)*0.9)] ${
                i === index
                  ? "w-[22px] bg-accent @3xl:w-[calc(var(--gap)*2.6)]"
                  : `w-[10px] @3xl:w-[calc(var(--gap)*0.9)] ${i < index ? "bg-accent/40" : "bg-line"} hover:bg-accent/70`
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
          {last ? finishLabel : index === steps.length - 1 && epilogue ? epilogue.title : "Next step"} <ArrowRight className="size-[1.1em]" strokeWidth={3} aria-hidden="true" />
        </button>
      </footer>
    </motion.section>
  );
}

function Narration({
  step,
  index,
  total,
  reduced,
  skip,
}: {
  step: RevealStep;
  index: number;
  total: number;
  reduced: boolean;
  skip?: { label: string; onClick: () => void };
}) {
  return (
    <div className="flex min-h-0 flex-1 items-start gap-[var(--gap)]">
      <BotAvatar />
      <div className="relative flex min-h-[5.5em] flex-1 flex-col justify-center rounded-[var(--r-key)] bg-accent/8 px-[var(--pad)] py-[var(--gap)] @3xl:h-full">
        {/* speech-bubble tail */}
        <span className="absolute -left-[7px] top-[calc(var(--chip)*0.55)] size-[14px] rotate-45 bg-[#F4EFFE]" aria-hidden="true" />
        <p className="mb-1 text-[length:var(--fs-key)] font-extrabold uppercase tracking-[0.1em] text-accent @3xl:text-[length:var(--fs-ui)]">
          Step {index + 1} of {total}
        </p>
        {/* Swaps instantly with the panels (a short fade, no exit delay) so text and state never disagree. */}
        <motion.p
          key={index}
          aria-live="polite"
          initial={reduced ? false : { opacity: 0.35 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.15 }}
          className="text-[length:calc(var(--fs-option)*1.05)] font-bold leading-snug text-ink"
        >
          {step.frame.say}
        </motion.p>
        {skip && (
          <button
            type="button"
            onClick={skip.onClick}
            className={`mt-[var(--gap)] inline-flex items-center gap-1.5 self-start rounded-full border-2 border-accent/40 bg-surface px-3 py-1 text-[length:var(--fs-ui)] font-extrabold text-accent transition-colors hover:bg-accent hover:text-white ${FOCUS_RING}`}
          >
            <FastForward className="size-[1em]" aria-hidden="true" /> {skip.label}
          </button>
        )}
      </div>
    </div>
  );
}

function LayerLadder({ step, code, reduced }: { step: RevealStep; code?: CodeBlock; reduced: boolean }) {
  const activeIdx = LAYERS.findIndex((l) => l.id === step.frame.layer);

  return (
    <ol className="relative flex min-h-0 flex-col gap-[calc(var(--gap)*0.8)]">
      {LAYERS.map(({ id, title, hint, Icon }, i) => {
        const active = i === activeIdx;
        const passed = i < activeIdx;
        return (
          <li key={id} className={`relative flex gap-[var(--gap)] ${id === "memory" ? "min-h-[7em] flex-1" : "shrink-0"}`}>
            {/* The rail to the next layer: purple down to the layer this step reaches. */}
            {i < LAYERS.length - 1 && (
              <span
                aria-hidden="true"
                className={`absolute bottom-[calc(-1*(var(--gap)*0.8+var(--chip)*0.5))] left-[calc(var(--chip)*0.5-2px)] top-[calc(var(--chip)*0.5)] w-1 rounded-full transition-colors duration-300 ${
                  i < activeIdx ? "bg-accent" : "bg-line"
                }`}
              />
            )}
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
              <div className={`min-h-0 flex-1 ${id === "memory" ? "overflow-y-auto" : ""}`}>
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
  if (step.line === null) {
    return <p className="text-[length:var(--fs-ui)] font-semibold text-ink-muted">Before running: the engine reads the whole program</p>;
  }
  const text = code?.lines[step.line]?.trim();
  return (
    <p className="truncate font-mono text-[length:var(--fs-ui)] font-semibold text-ink">
      <span className="mr-2 text-ink-muted">line {step.line + 1}</span>
      {text}
    </p>
  );
}

/** What the engine works out (the eval chain), and the call stack when there is one. */
function RuntimeLayer({ step, reduced }: { step: RevealStep; reduced: boolean }) {
  const hasStack = step.stack.length > 0;
  if (step.eval.length === 0 && !hasStack) {
    return <p className="text-[length:var(--fs-ui)] font-semibold text-ink-muted">Nothing to work out on this step</p>;
  }
  return (
    <div className="flex flex-wrap items-center gap-x-[var(--gap)] gap-y-[calc(var(--gap)*0.4)]">
      {step.eval.length > 0 && (
        <div className="flex flex-wrap items-center gap-[calc(var(--gap)*0.4)] font-mono text-[length:var(--fs-ui)] font-bold">
          {step.eval.map((part, i) => {
            const final = i === step.eval.length - 1;
            return (
              <motion.span
                key={`${part}-${i}`}
                initial={reduced ? false : { opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: reduced ? 0 : i * 0.12, duration: 0.15 }}
                className="flex items-center gap-[calc(var(--gap)*0.4)]"
              >
                {i > 0 && <span className="text-ink-muted">→</span>}
                <span
                  className={`rounded-[calc(var(--r-key)*0.5)] px-1.5 py-0.5 ${
                    !final
                      ? "bg-surface text-ink ring-1 ring-line"
                      : part === "true"
                        ? "bg-correct text-white"
                        : part === "false"
                          ? "bg-wrong text-white"
                          : "bg-accent text-white"
                  }`}
                >
                  {part}
                </span>
              </motion.span>
            );
          })}
        </div>
      )}
      {hasStack && (
        <div className="flex flex-wrap items-center gap-[calc(var(--gap)*0.5)]">
          <span className="text-[length:var(--fs-key)] font-bold text-ink-muted">stack:</span>
          <AnimatePresence initial={false} mode="popLayout">
            {step.stack.map((frame, i) => (
              <motion.span
                key={`${frame}-${step.stack.length - i}`}
                layout={!reduced}
                initial={reduced ? false : { opacity: 0, y: -10, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={reduced ? undefined : { opacity: 0, y: -10, scale: 0.9 }}
                transition={motionTokens.snap}
                className={`rounded-[calc(var(--r-key)*0.6)] px-2 py-0.5 font-mono text-[length:var(--fs-key)] font-bold @3xl:text-[length:var(--fs-ui)] ${
                  i === 0 ? "bg-ink text-white" : "bg-line text-ink"
                }`}
              >
                {frame}
              </motion.span>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

/** Boxes grouped by where they live: global, a function's frame, or the loop. */
function MemoryLayer({ step, reduced }: { step: RevealStep; reduced: boolean }) {
  if (step.memory.length === 0) {
    return <p className="text-[length:var(--fs-ui)] font-semibold text-ink-muted">Nothing stored yet</p>;
  }
  const groups = groupByScope(step.memory);
  return (
    <div className="flex flex-wrap items-start gap-[var(--gap)]">
      <AnimatePresence initial={false} mode="popLayout">
        {groups.map((group) => (
          <motion.div
            key={group.scope}
            layout={!reduced}
            initial={reduced ? false : { opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={reduced ? undefined : { opacity: 0, scale: 0.8 }}
            transition={motionTokens.snap}
            className={`flex flex-col gap-0.5 rounded-[calc(var(--r-key)*0.7)] px-[calc(var(--gap)*0.5)] pb-[calc(var(--gap)*0.4)] pt-0.5 ${
              group.scope === "global" ? "bg-transparent" : "bg-accent/8 ring-1 ring-accent/30"
            }`}
          >
            {groups.length > 1 && (
              <span className="font-mono text-[length:var(--fs-key)] font-bold text-ink-muted">{group.scope}</span>
            )}
            <div className="flex flex-wrap gap-[var(--gap)]">
              {group.boxes.map((box) => (
                <div key={box.name} className="flex flex-col items-center">
                  <span className="font-mono text-[length:var(--fs-key)] font-bold text-ink-muted">{box.name}</span>
                  <motion.span
                    key={`${box.value}-${box.uninitialized}`}
                    initial={reduced || !box.changed ? false : { scale: 1.3, rotate: -4 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={motionTokens.pull}
                    title={box.uninitialized ? "Declared, but not ready to use yet" : undefined}
                    className={`flex min-w-[calc(var(--chip)*1.4)] items-center justify-center whitespace-nowrap rounded-[calc(var(--r-key)*0.6)] border-2 px-[calc(var(--gap)*0.7)] py-[calc(var(--gap)*0.25)] font-mono font-bold ${
                      box.uninitialized
                        ? "border-dashed border-ink-muted/50 bg-[repeating-linear-gradient(135deg,transparent_0_6px,rgba(107,112,144,0.12)_6px_12px)] text-[length:var(--fs-key)] text-ink-muted"
                        : box.changed
                          ? "border-focus bg-[#FEF9C3] text-[length:calc(var(--fs-option)*0.85)] text-ink shadow-[0_3px_0_#EAB308]"
                          : "border-line bg-surface text-[length:calc(var(--fs-option)*0.85)] text-ink shadow-key"
                    }`}
                  >
                    {box.uninitialized ? "not ready" : box.value}
                  </motion.span>
                </div>
              ))}
            </div>
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
