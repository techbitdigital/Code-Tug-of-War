import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-6 p-8">
      <p className="font-display text-sm font-bold uppercase tracking-[0.12em] text-ink-muted">
        Code Tug of War
      </p>
      <h1 className="font-display text-5xl font-bold">
        See what happens beneath every line of code.
      </h1>
      <p className="text-lg text-ink-muted">
        The match screen is next (Step 2). For now, the styleguide shows the design tokens and
        team panels.
      </p>
      <Link href="/dev/styleguide" className="font-semibold underline">
        Open the styleguide
      </Link>
    </main>
  );
}