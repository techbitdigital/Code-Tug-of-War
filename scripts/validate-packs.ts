import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { lintRound } from "../lib/revealLint";
import { parsePack } from "../lib/schema";

const dir = join(process.cwd(), "data", "packs");
const files = readdirSync(dir).filter((file) => file.endsWith(".json"));

let failed = false;
let warnings = 0;
const seenIds = new Set<string>();

for (const file of files) {
  try {
    const pack = parsePack(JSON.parse(readFileSync(join(dir, file), "utf8")));
    if (seenIds.has(pack.id)) throw new Error(`  duplicate pack id "${pack.id}"`);
    seenIds.add(pack.id);

    // Content checks: narration vs panels, changed flags, empty runtime steps, length limits.
    const issues = pack.rounds.flatMap(lintRound);
    const errors = issues.filter((i) => i.level === "error");
    warnings += issues.length - errors.length;
    if (errors.length) failed = true;

    console.log(`${errors.length ? "FAIL" : "ok  "}  ${file}  (${pack.rounds.length} rounds)`);
    for (const issue of issues) console.log(`      ${issue.level === "error" ? "error" : "warn "}  ${issue.where}: ${issue.message}`);
  } catch (error) {
    failed = true;
    console.error(`FAIL  ${file}\n${error instanceof Error ? error.message : error}`);
  }
}

if (warnings) console.log(`\n${warnings} warning(s)`);
if (failed) process.exit(1);
