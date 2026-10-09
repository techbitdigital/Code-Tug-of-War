import type { CSSProperties } from "react";
import { tokenizeLine, type TokenKind } from "@/lib/highlight";
import type { CodeBlock } from "@/lib/types";

const KIND_CLASS: Record<TokenKind, string> = {
  key: "text-code-key",
  str: "text-code-str",
  num: "text-code-num",
  fn: "text-code-fn",
  cmt: "text-code-ink/50",
  plain: "",
};

interface CodeCardProps {
  code: CodeBlock;
  /** Stage-size multipliers from lib/fit.ts. Ignored on phones, which scroll instead. */
  fitW?: number;
  fitH?: number;
}

export default function CodeCard({ code, fitW = 1, fitH = 1 }: CodeCardProps) {
  const { lines, lang, focusLine } = code;

  const style = {
    "--fit-w": fitW.toFixed(3),
    "--fit-h": fitH.toFixed(3),
  } as CSSProperties;

  return (
    <div
      role="group"
      aria-label="Code"
      style={style}
      className="code-text overflow-x-auto rounded-[var(--r-key)] @3xl:overflow-hidden bg-code-bg py-[var(--gap)] pr-[var(--gap)] font-mono font-medium leading-[1.4] text-code-ink"
    >
      {lines.map((line, i) => {
        const focused = i === focusLine;
        const tokens = tokenizeLine(line, lang);
        return (
          <div
            key={i}
            className={`flex w-max min-w-full border-l-[4px] @3xl:w-auto ${
              focused ? "border-focus bg-white/10" : "border-transparent"
            }`}
          >
            <span
              aria-hidden="true"
              className="w-[2.2em] shrink-0 select-none pr-[0.7em] text-right text-code-ink/40"
            >
              {i + 1}
            </span>
            <span className="whitespace-pre">
              {tokens.length === 0
                ? " "
                : tokens.map((token, t) => (
                    <span key={t} className={KIND_CLASS[token.kind]}>
                      {token.text}
                    </span>
                  ))}
            </span>
          </div>
        );
      })}
    </div>
  );
}
