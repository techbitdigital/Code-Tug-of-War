import bootcampJsBasics from "@/data/packs/bootcamp-js-basics.json";
import { parsePack } from "./schema";
import type { Pack, Round } from "./types";

// Every pack is validated at load time, so a bad pack fails loudly instead of
// breaking mid-match. Register new packs in this list.
const packs: Pack[] = [parsePack(bootcampJsBasics)];

export function getPacks(): Pack[] {
  return packs;
}

export function getPack(id: string): Pack | undefined {
  return packs.find((pack) => pack.id === id);
}

export function getRound(packId: string, roundId: string): Round | undefined {
  return getPack(packId)?.rounds.find((round) => round.id === roundId);
}