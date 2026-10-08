import Link from "next/link";
import { getAllRounds } from "@/lib/rounds";

export default function HomePage() {
  const rounds = getAllRounds();

  return (
    <main className="min-h-screen p-10 flex flex-col gap-6">
      <h1 className="text-3xl font-bold">Code Tug of War — Phase 1</h1>
      <p className="text-[#57534E] max-w-md">
        Pick a round to play through the watch → predict → reveal loop.
      </p>
      <ul className="flex flex-col gap-2">
        {rounds.map((round) => (
          <li key={round.id}>
            <Link href={`/round/${round.id}`} className="underline font-mono text-[#2F6FED]">
              {round.title}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
