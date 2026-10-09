import type { CSSProperties } from "react";
import type { Round } from "@/lib/types";
import { fitQuestion } from "@/lib/fit";
import CodeCard from "./CodeCard";

interface QuestionCardProps {
  round: Pick<Round, "prompt" | "code">;
}

export default function QuestionCard({ round }: QuestionCardProps) {
  // The card never changes size, so the text shrinks to fit it (stage only; phones scroll/wrap).
  const fit = fitQuestion(round.prompt, round.code?.lines);
  const style = { "--fit": fit.prompt.toFixed(3) } as CSSProperties;

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
