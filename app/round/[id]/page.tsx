import { notFound } from "next/navigation";
import { getRound } from "@/lib/rounds";
import RoundPlayer from "@/components/RoundPlayer";

export default function RoundPage({ params }: { params: { id: string } }) {
  const round = getRound(params.id);
  if (!round) return notFound();

  return (
    <main className="min-h-screen p-10">
      <RoundPlayer round={round} />
    </main>
  );
}
