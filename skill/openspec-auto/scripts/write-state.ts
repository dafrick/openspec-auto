import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { type AgentState, VALID_PHASES } from "./types.js";

const STATE_DIR = ".openspec-auto";
const STATE_FILE = join(STATE_DIR, "state.json");

export function writeState(state: AgentState, cwd = process.cwd()): void {
  if (!VALID_PHASES.includes(state.phase)) {
    throw new Error(
      `Invalid phase "${state.phase}". Must be one of: ${VALID_PHASES.join(", ")}`
    );
  }
  const dir = join(cwd, STATE_DIR);
  const file = join(cwd, STATE_FILE);
  mkdirSync(dir, { recursive: true });
  writeFileSync(file, JSON.stringify(state, null, 2) + "\n", "utf8");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error("Usage: tsx scripts/write-state.ts <json-state>");
    process.exit(1);
  }
  try {
    const state = JSON.parse(args[0]) as AgentState;
    writeState(state);
    console.log("State written to", STATE_FILE);
  } catch (err) {
    console.error((err as Error).message);
    process.exit(1);
  }
}
