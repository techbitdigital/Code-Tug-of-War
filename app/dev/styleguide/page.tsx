import Link from "next/link";
import { notFound } from "next/navigation";
import Button from "@/components/ui/Button";
import TeamPanel from "@/components/match/TeamPanel";
import { getPacks } from "@/lib/packs";

const SWATCHES = [
  ["--arena-bg", "Arena"],
  ["--surface", "Surface"],
  ["--ink", "Ink"],
  ["--ink-muted", "Ink muted"],
  ["--line", "Line"],
  ["--team-a", "Team A"],
  ["--team-a-bright", "Team A bright"],
  ["--team-a-soft", "Team A soft"],
  ["--team-b", "Team B"],
  ["--team-b-bright", "Team B bright"],
  ["--team-b-soft", "Team B soft"],
  ["--accent", "Accent"],
  ["--correct", "Correct"],
  ["--wrong", "Wrong"],
  ["--focus", "Focus"],
  ["--code-bg", "Code bg"],
  ["--code-ink", "Code ink"],
] as const;

const TYPE_SCALE = [
  { label: "Display", cls: "font-display text-display font-bold", sample: "PULL!" },
  { label: "Question prompt", cls: "font-display text-prompt font-bold", sample: "What does this print?" },
  { label: "Code", cls: "font-mono text-code font-medium", sample: "let x = 2;" },
  { label: "Answer option", cls: "font-sans text-option font-semibold", sample: "A   42" },
  { label: "Team name", cls: "font-display text-name font-bold uppercase tracking-[0.04em]", sample: "Cohort A" },
  { label: "UI body", cls: "font-sans text-body", sample: "Pick a pack, set up two teams, and start the match." },
] as const;

export default function StyleguidePage() {
  if (process.env.NODE_ENV === "production") notFound();

  const packs = getPacks();
  const roundCount = packs.reduce((total, pack) => total + pack.rounds.length, 0);

  return (
    <main className="mx-auto max-w-6xl space-y-12 p-8">
      <header className="space-y-2">
        <h1 className="font-display text-5xl font-bold">Styleguide</h1>
        <p className="text-ink-muted">
          Dev only. {packs.length} pack loaded, {roundCount} rounds validated.{" "}
          <Link href="/dev/match" className="font-semibold text-ink underline">
            Open the match screen
          </Link>
        </p>
      </header>

      <section className="space-y-4">
        <h2 className="font-display text-2xl font-bold">Colour</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-7">
          {SWATCHES.map(([token, label]) => (
            <div key={token} className="space-y-2">
              <div
                className="h-16 rounded-2xl shadow-panel"
                style={{ background: `var(${token})` }}
              />
              <div className="text-sm font-semibold">{label}</div>
              <div className="font-mono text-xs text-ink-muted">{token}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-2xl font-bold">Type scale</h2>
        <div className="space-y-6">
          {TYPE_SCALE.map(({ label, cls, sample }) => (
            <div key={label}>
              <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-ink-muted">
                {label}
              </div>
              <div className={cls}>{sample}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-2xl font-bold">Buttons</h2>
        <div className="flex flex-wrap items-center gap-4">
          <Button size="lg">Start match</Button>
          <Button size="lg" variant="secondary">Replay misses</Button>
          <Button>Next question</Button>
          <Button variant="secondary">Skip</Button>
          <Button disabled>Disabled</Button>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-2xl font-bold">Team panels</h2>
        {/* match-stage supplies the size tokens the panels read (phone-size values here). */}
        <div className="match-stage grid gap-6 md:grid-cols-3">
          <TeamPanel
            side="a"
            name="Cohort A"
            pulls={1}
            answer={{ type: "mcq", options: ["2", "6", "23", "undefined"], correctIndex: 1 }}
          />
          <TeamPanel
            side="b"
            name="Cohort B"
            locked
            answer={{ type: "mcq", options: ["2", "6", "23", "undefined"], correctIndex: 1 }}
          />
          <TeamPanel side="a" name="You" pulls={2} answer={{ type: "text", accept: ["6"] }} />
        </div>
      </section>
    </main>
  );
}
