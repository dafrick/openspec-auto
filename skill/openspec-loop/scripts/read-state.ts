import { readFileSync } from "node:fs";
import { join } from "node:path";
import { type AgentState, VALID_PHASES } from "./types.js";

const STATE_FILE = join(".openspec-loop", "state.json");

export function readState(cwd = process.cwd()): AgentState {
  const file = join(cwd, STATE_FILE);
  let raw: string;
  try {
    raw = readFileSync(file, "utf8");
  } catch {
    throw new Error(
      `State file not found at ${file}. Run the loop from the project root.`
    );
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`State file at ${file} contains invalid JSON.`);
  }
  const state = parsed as AgentState;
  if (!VALID_PHASES.includes(state.phase)) {
    throw new Error(
      `State file has invalid phase "${state.phase}". Expected one of: ${VALID_PHASES.join(", ")}`
    );
  }
  return state;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const state = readState();
    console.log(JSON.stringify(state, null, 2));
  } catch (err) {
    console.error((err as Error).message);
    process.exit(1);
  }
}
