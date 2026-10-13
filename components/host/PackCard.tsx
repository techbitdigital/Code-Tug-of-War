import Link from "next/link";
import { ArrowRight, Clock, ListChecks } from "lucide-react";
import type { Pack } from "@/lib/types";

// Track → colour, label and difficulty dots (out of 5). Full class strings for Tailwind.
const TRACK = {
  beginner: { label: "Beginner", dots: 1, text: "text-[#059669]", dot: "bg-[#10B981]", button: "from-[#10B981] to-[#059669] shadow-[0_5px_0_#047857]" },
  junior: { label: "Junior", dots: 3, text: "text-team-a", dot: "bg-team-a", button: "from-team-a-bright to-team-a shadow-[0_5px_0_var(--team-a-deep)]" },
  mid: { label: "Mid-level", dots: 4, text: "text-[#EA580C]", dot: "bg-[#F59E0B]", button: "from-[#F59E0B] to-[#EA580C] shadow-[0_5px_0_#C2410C]" },
} as const;

const LANG_ICON: Record<string, string> = { js: "JS", py: "PY", html: "</>", sql: "SQL" };

export default function PackCard({ pack }: { pack: Pack }) {
  const t = TRACK[pack.track];
  const lang = pack.rounds.find((r) => r.code)?.code?.lang ?? "js";
  return (
    <article className="relative flex flex-col overflow-hidden rounded-[28px] bg-surface shadow-panel transition-transform duration-200 hover:-translate-y-1">
      <div className="flex flex-1 flex-col gap-4 p-6">
        <div className="flex items-start justify-between">
          <span className={`flex size-14 items-center justify-center rounded-2xl bg-arena font-mono text-lg font-black ${t.text}`}>
            {LANG_ICON[lang] ?? "{}"}
          </span>
          <span className="flex gap-1" aria-label={`Difficulty ${t.dots} of 5`}>
            {Array.from({ length: 5 }, (_, i) => (
              <span key={i} className={`size-2.5 rounded-full ${i < t.dots ? t.dot : "bg-line"}`} />
            ))}
          </span>
        </div>
        <div>
          <p className={`text-xs font-extrabold uppercase tracking-[0.1em] ${t.text}`}>{t.label}</p>
          <h3 className="mt-1 font-display text-2xl font-black leading-tight text-ink">{pack.title}</h3>
          <p className="mt-2 text-sm font-semibold text-ink-muted">
            {[...new Set(pack.rounds.map((r) => r.concept))].slice(0, 4).join(" · ")}
          </p>
        </div>
        <div className="flex gap-4 text-sm font-bold text-ink-muted">
          <span className="inline-flex items-center gap-1.5">
            <ListChecks className="size-4" aria-hidden="true" /> {pack.rounds.length} questions
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Clock className="size-4" aria-hidden="true" /> 10–{pack.estMinutes} min
          </span>
        </div>
        <Link
          href={`/play/${pack.id}`}
          className={`mt-auto inline-flex h-12 items-center justify-center gap-2 self-start rounded-full bg-gradient-to-b px-6 font-display text-lg font-black text-white transition-[transform,box-shadow] active:translate-y-[4px] active:shadow-none focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-focus ${t.button}`}
        >
          Play now <ArrowRight className="size-5" strokeWidth={3} aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}
