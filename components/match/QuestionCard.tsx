import type { CSSProperties } from "react";
import { Lock } from "lucide-react";
import type { Round } from "@/lib/types";
import { fitQuestion } from "@/lib/fit";
import CodeCard from "./CodeCard";

interface QuestionCardProps {
  round: Pick<Round, "prompt" | "code">;
  /** Before the match starts: hide the question so nobody gets a head start. */
  concealed?: boolean;
}

export default function QuestionCard({ round, concealed = false }: QuestionCardProps) {
  // The card never changes size, so the text shrinks to fit it (stage only; phones scroll/wrap).
  const fit = fitQuestion(round.prompt, round.code?.lines);
  const style = { "--fit": fit.prompt.toFixed(3) } as CSSProperties;

  if (concealed) {
    return (
      <section
        aria-label="Question"
        className="flex h-full min-h-[10rem] flex-col items-center justify-center gap-[var(--gap)] rounded-[var(--r-card)] bg-surface p-[var(--pad)] text-center shadow-panel"
      >
        <span className="flex size-[calc(var(--chip)*1.4)] items-center justify-center rounded-full bg-arena text-ink-muted">
          <Lock className="size-[45%]" strokeWidth={2.5} aria-hidden="true" />
        </span>
        <p className="font-display text-[length:var(--fs-prompt)] font-black text-ink">The question appears on Go</p>
        <p className="text-[length:var(--fs-ui)] font-bold text-ink-muted">No head starts.</p>
      </section>
    );
  }

  return (
    <section
      aria-label="Question"
      className="flex h-full flex-col gap-[var(--gap)] overflow-hidden rounded-[var(--r-card)] bg-surface p-[var(--pad)] shadow-panel"
    >
      <h1 style={style} className="prompt-text text-center font-display font-black leading-[1.1] text-balance text-ink">
        {round.prompt}
      </h1>
      {round.code && (
        <div className="flex min-h-0 flex-1 flex-col justify-center">
          <CodeCard code={round.code} fitW={fit.codeW} fitH={fit.codeH} />
        </div>
      )}
    </section>
  );
}
