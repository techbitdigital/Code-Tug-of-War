import { Round } from "./types";
import variables1 from "@/data/rounds/variables-1.json";
import loops1 from "@/data/rounds/loops-1.json";
import functions1 from "@/data/rounds/functions-1.json";

// Phase 1: rounds are imported directly as static JSON.
// This moves to Supabase once the schema has survived Phases 3-4
// (see the build-order discussion) and curriculum content needs
// to grow without a redeploy.
const rounds: Round[] = [variables1, loops1, functions1] as Round[];

export function getAllRounds(): Round[] {
  return rounds;
}

export function getRound(id: string): Round | undefined {
  return rounds.find((r) => r.id === id);
}
