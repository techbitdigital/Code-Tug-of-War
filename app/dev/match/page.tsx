import { notFound } from "next/navigation";
import MatchDemo from "@/components/match/MatchDemo";
import { getPacks } from "@/lib/packs";

export default function MatchDevPage() {
  if (process.env.NODE_ENV === "production") notFound();

  const rounds = getPacks().flatMap((pack) => pack.rounds);
  return <MatchDemo rounds={rounds} />;
}
