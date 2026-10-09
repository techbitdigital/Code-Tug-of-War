import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parsePack } from "../lib/schema";

const dir = join(process.cwd(), "data", "packs");
const files = readdirSync(dir).filter((file) => file.endsWith(".json"));

let failed = false;
const seenIds = new Set<string>();

for (const file of files) {
  try {
    const pack = parsePack(JSON.parse(readFileSync(join(dir, file), "utf8")));
    if (seenIds.has(pack.id)) throw new Error(`  duplicate pack id "${pack.id}"`);
    seenIds.add(pack.id);
    console.log(`ok    ${file}  (${pack.rounds.length} rounds)`);
  } catch (error) {
    failed = true;
    console.error(`FAIL  ${file}\n${error instanceof Error ? error.message : error}`);
  }
}

if (failed) process.exit(1);