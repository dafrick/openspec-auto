import { readFileSync } from "node:fs";
import { readState } from "./read-state.js";
import { renderPrBlock } from "./sync-pr-state.js";
import { editPrBody } from "./pr-body.js";

/**
 * The closing-keyword footer. It must survive every body rewrite: GitHub's
 * issue↔PR link (`closedByPullRequestsReferences`, how the next run rediscovers
 * this work) and auto-close-on-merge both depend on a `Closes #N` keyword
 * staying in the body.
 */
export function issueFooter(issue: number): string {
  return `---\n\nCloses #${issue} — autonomous implementation by openspec-auto. See the issue for full context.`;
}

/**
 * Compose the PR description: the agent-status block at the top, the latest
 * summary (discovery → proposal → implementation) in the middle, the issue
 * footer at the bottom. The whole body is overwritten on each summary write,
 * so the description always holds exactly one (current) summary.
 */
export function composePrBody(
  statusBlock: string,
  discovery: string,
  issue: number
): string {
  return `${statusBlock}\n\n${discovery.trim()}\n\n${issueFooter(issue)}\n`;
}

export function writeDiscovery(
  prNumber: number,
  discovery: string,
  cwd = process.cwd()
): void {
  const state = readState(cwd);
  const body = composePrBody(renderPrBlock(state), discovery, state.issue);
  editPrBody(prNumber, body, cwd);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const prNumber = parseInt(process.argv[2] ?? "", 10);
  const discoveryFile = process.argv[3];
  if (isNaN(prNumber) || !discoveryFile) {
    console.error(
      "Usage: tsx scripts/write-discovery.ts <pr-number> <discovery-file>"
    );
    process.exit(1);
  }
  try {
    writeDiscovery(prNumber, readFileSync(discoveryFile, "utf8"));
    console.log(`PR #${prNumber} description updated with discovery output.`);
  } catch (err) {
    console.error((err as Error).message);
    process.exit(1);
  }
}
