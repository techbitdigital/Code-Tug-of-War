import { notFound } from "next/navigation";
import MatchLab from "@/components/match/MatchLab";
import { getPacks } from "@/lib/packs";

export default function MatchDevPage() {
  if (process.env.NODE_ENV === "production") notFound();

  const rounds = getPacks().flatMap((pack) => pack.rounds);
  return <MatchLab rounds={rounds} />;
}
