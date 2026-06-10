import { readFileSync } from "node:fs";
import { readState } from "./read-state.js";
import { renderPrBlock } from "./sync-pr-state.js";
import { editPrBody } from "./pr-body.js";

/**
 * Compose the PR description: the agent-status block at the top, the latest
 * discovery output below it. The whole body is overwritten on each explore
 * run, so the description always holds exactly one (current) discovery.
 */
export function composePrBody(statusBlock: string, discovery: string): string {
  return `${statusBlock}\n\n${discovery.trim()}\n`;
}

export function writeDiscovery(
  prNumber: number,
  discovery: string,
  cwd = process.cwd()
): void {
  const body = composePrBody(renderPrBlock(readState(cwd)), discovery);
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
