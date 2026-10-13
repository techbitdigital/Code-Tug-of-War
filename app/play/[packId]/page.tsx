import { notFound } from "next/navigation";
import SetupFlow from "@/components/host/SetupFlow";
import { getPack, getPacks } from "@/lib/packs";

export function generateStaticParams() {
  return getPacks().map((pack) => ({ packId: pack.id }));
}

export default function PlayPage({ params }: { params: { packId: string } }) {
  const pack = getPack(params.packId);
  if (!pack) notFound();
  return <SetupFlow pack={pack} />;
}
