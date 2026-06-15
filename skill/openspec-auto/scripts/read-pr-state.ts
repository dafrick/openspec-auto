import { execSync } from "node:child_process";
import { parseAgentState } from "./survey.js";
import type { AgentState } from "./types.js";

/**
 * Recover the full within-run state from a PR's durable agent-state marker.
 * The triage survey only surfaces `phase`/`blocked`, but a resume also needs
 * `branch` (to check out) and `changeName` (to pass to every later stage) —
 * both live in the marker `renderPrBlock` wrote into the PR body. This reads
 * them back and validates the marker is complete. It prints the state; it does
 * not write `state.json`, because the orchestrator needs `branch` to create the
 * worktree *before* `state.json` can be written inside it.
 */
const REQUIRED_FIELDS = [
  "phase",
  "issue",
  "prNumber",
  "branch",
  "changeName",
  "ciFixes",
  "blocked",
] as const;

export function readPrState(prNumber: number, cwd = process.cwd()): AgentState {
  const body = execSync(`gh pr view ${prNumber} --json body -q .body`, {
    cwd,
    encoding: "utf8",
  });
  const parsed = parseAgentState(body);
  if (!parsed) {
    throw new Error(
      `PR #${prNumber} has no valid agent-state marker — cannot resume it.`
    );
  }
  for (const field of REQUIRED_FIELDS) {
    if (!(field in parsed)) {
      throw new Error(
        `Agent-state marker on PR #${prNumber} is missing "${field}".`
      );
    }
  }
  return parsed as unknown as AgentState;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const prNumber = parseInt(process.argv[2] ?? "", 10);
  if (Number.isNaN(prNumber)) {
    console.error("Usage: tsx scripts/read-pr-state.ts <pr-number>");
    process.exit(1);
  }
  try {
    console.log(JSON.stringify(readPrState(prNumber)));
  } catch (err) {
    console.error((err as Error).message);
    process.exit(1);
  }
}
