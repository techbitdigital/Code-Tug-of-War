import { Code2, Cpu, Box, Terminal } from "lucide-react";
import Logo from "@/components/brand/Logo";
import PackCard from "@/components/host/PackCard";
import { getPacks } from "@/lib/packs";

const LAYERS = [
  { Icon: Code2, label: "Code" },
  { Icon: Cpu, label: "Runtime" },
  { Icon: Box, label: "Memory" },
  { Icon: Terminal, label: "Output" },
];

export default function HomePage() {
  const packs = getPacks();
  return (
    <main className="page-bg">
      <div className="mx-auto flex max-w-6xl flex-col gap-12 px-4 py-8 sm:px-8 sm:py-12">
        <header className="flex items-center justify-between">
          <Logo />
        </header>

        <section className="flex flex-col items-center gap-5 text-center">
          <span className="rounded-full bg-accent/10 px-4 py-1.5 text-sm font-extrabold text-accent">
            Predict · Pull · See beneath the line
          </span>
          <h1 className="max-w-3xl font-display text-4xl font-black leading-[1.05] text-ink sm:text-6xl">
            Two teams. One line of code. <span className="text-accent">Who really knows what it does?</span>
          </h1>
          <p className="max-w-2xl text-lg font-semibold text-ink-muted">
            Each team locks in an answer. The right team pulls the rope. Then everyone sees what the computer actually did,
            layer by layer.
          </p>
          <ol className="flex flex-wrap justify-center gap-2" aria-label="The layers every reveal walks through">
            {LAYERS.map(({ Icon, label }, i) => (
              <li key={label} className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 text-sm font-extrabold text-ink shadow-panel">
                  <Icon className="size-4 text-accent" aria-hidden="true" /> {label}
                </span>
                {i < LAYERS.length - 1 && <span className="text-ink-muted" aria-hidden="true">↓</span>}
              </li>
            ))}
          </ol>
        </section>

        <section className="flex flex-col gap-6" aria-labelledby="packs-heading">
          <div className="text-center">
            <h2 id="packs-heading" className="font-display text-3xl font-black text-ink">
              Choose a pack
            </h2>
            <p className="mt-1 font-semibold text-ink-muted">Each pack is a short match, 5 to 10 minutes.</p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {packs.map((pack) => (
              <PackCard key={pack.id} pack={pack} />
            ))}
            <article className="flex flex-col items-center justify-center gap-2 rounded-[28px] border-2 border-dashed border-line p-6 text-center">
              <p className="font-display text-xl font-black text-ink-muted">More packs coming</p>
              <p className="text-sm font-semibold text-ink-muted">Python, HTML, SQL and how the web works.</p>
            </article>
          </div>
        </section>
      </div>
    </main>
  );
}
