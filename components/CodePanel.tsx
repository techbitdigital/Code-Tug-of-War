"use client";

interface CodePanelProps {
  code: string;
  highlightLine: number;
}

export default function CodePanel({ code, highlightLine }: CodePanelProps) {
  const lines = code.split("\n");

  return (
    <pre className="bg-[#141413] text-[#FAF9F5] font-mono text-sm leading-7 p-4 rounded-xl overflow-x-auto">
      <code>
        {lines.map((line, i) => {
          const lineNumber = i + 1;
          const isActive = lineNumber === highlightLine;
          return (
            <div
              key={i}
              className={isActive ? "bg-[#2F6FED]/40 rounded px-1 -mx-1" : ""}
            >
              {line || "\u00A0"}
            </div>
          );
        })}
      </code>
    </pre>
  );
}
