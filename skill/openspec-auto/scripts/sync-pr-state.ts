import { editPrBody, readPrBody } from "./pr-body.js";
import { readState } from "./read-state.js";
import type { AgentState } from "./types.js";

export function renderPrBlock(state: AgentState): string {
  const rows = [
    ["Phase", state.phase],
    ["Issue", `#${state.issue}`],
    ["PR", `#${state.prNumber}`],
    ["Branch", state.branch],
    ["Change", state.changeName],
    ["CI Fixes", String(state.ciFixes)],
    ["Blocked", state.blocked ? "yes" : "no"],
  ];
  const table = [
    "## Agent Status",
    "",
    "| Field | Value |",
    "|-------|-------|",
    ...rows.map(([k, v]) => `| ${k} | ${v} |`),
    "",
    `<!-- agent-state: ${JSON.stringify(state)} -->`,
  ].join("\n");
  return table;
}

export const AGENT_STATUS_PATTERN =
  /## Agent Status[\s\S]*?<!-- agent-state:.*?-->/;

/**
 * Update only the `## Agent Status` block in the PR body, in place. The status
 * block lives at the top of the description; the discovery output (if any)
 * follows below it and is left untouched.
 */
export function syncPrState(prNumber: number, cwd = process.cwd()): void {
  const block = renderPrBlock(readState(cwd));
  const currentBody = readPrBody(prNumber, cwd);

  let newBody: string;
  if (AGENT_STATUS_PATTERN.test(currentBody)) {
    newBody = currentBody.replace(AGENT_STATUS_PATTERN, block);
  } else {
    newBody = currentBody ? `${block}\n\n${currentBody}` : block;
  }

  editPrBody(prNumber, newBody, cwd);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const prNumber = parseInt(process.argv[2] ?? "", 10);
  if (Number.isNaN(prNumber)) {
    console.error("Usage: tsx scripts/sync-pr-state.ts <pr-number>");
    process.exit(1);
  }
  try {
    syncPrState(prNumber);
    console.log(`PR #${prNumber} description updated.`);
  } catch (err) {
    console.error((err as Error).message);
    process.exit(1);
  }
}
