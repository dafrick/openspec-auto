import { execSync } from "node:child_process";
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

export function syncPrState(prNumber: number, cwd = process.cwd()): void {
  const state = readState(cwd);
  const block = renderPrBlock(state);

  const currentBody = execSync(`gh pr view ${prNumber} --json body -q .body`, {
    encoding: "utf8",
    cwd,
  }).trim();

  const agentStatusPattern = /## Agent Status[\s\S]*?<!-- agent-state:.*?-->/;
  let newBody: string;
  if (agentStatusPattern.test(currentBody)) {
    newBody = currentBody.replace(agentStatusPattern, block);
  } else {
    newBody = currentBody ? `${currentBody}\n\n${block}` : block;
  }

  execSync(`gh pr edit ${prNumber} --body "${newBody.replace(/"/g, '\\"')}"`, {
    cwd,
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const prNumber = parseInt(process.argv[2] ?? "", 10);
  if (isNaN(prNumber)) {
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
