import { execSync } from "node:child_process";
import { readConfig } from "./read-config.js";
import { parseAgentState } from "./survey.js";
import { syncPrState } from "./sync-pr-state.js";
import { writeState } from "./write-state.js";

/**
 * Belt-and-suspenders dedup, independent of triage's linked-PR graph.
 * Triage joins issues to PRs via GitHub's `closedByPullRequestsReferences`
 * (the closing-keyword graph). This guard instead scans every open PR's
 * agent-state marker — the design's source of truth — and aborts if one
 * already covers this issue. It catches the case where the graph join missed
 * an in-flight PR (e.g. the link hadn't propagated), turning a silent
 * duplicate into a loud, recoverable stop right before the PR is created.
 */
/** Pure: the number of an open PR whose agent-state marker covers `issue`, or null. */
export function findDuplicateAgentPr(
  prs: { number: number; body: string }[],
  issue: number
): number | null {
  for (const pr of prs) {
    const state = parseAgentState(pr.body);
    if (state && (state as { issue?: unknown }).issue === issue) {
      return pr.number;
    }
  }
  return null;
}

export function assertNoOpenAgentPr(issue: number, cwd: string): void {
  let out: string;
  try {
    out = execSync("gh pr list --state open --json number,body --limit 100", {
      cwd,
      encoding: "utf8",
    });
  } catch {
    // If the lookup itself fails, don't block setup on it — triage already
    // surveyed; this is only a second opinion.
    return;
  }
  const prs = JSON.parse(out) as { number: number; body: string }[];
  const dup = findDuplicateAgentPr(prs, issue);
  if (dup !== null) {
    throw new Error(
      `Open agent PR #${dup} already covers issue #${issue}; aborting to avoid a duplicate.`
    );
  }
}

/**
 * Bundles the workspace-setup steps the orchestrator runs once per issue:
 * checkout the default branch + pull, create the branch, anchor an empty
 * commit, push, open a draft PR, then initialise and sync state.json.
 * Returns the PR number. The default branch comes from `.openspec-auto.json`
 * (set once by init), not hardcoded.
 *
 * Worktree creation is intentionally NOT done here — the orchestrator handles
 * that via superpowers:using-git-worktrees so the harness tracks it.
 */
export interface SetupArgs {
  issue: number;
  branch: string;
  title: string;
}

export function setupWorkspace(args: SetupArgs, cwd = process.cwd()): number {
  const { issue, branch, title } = args;
  const base = readConfig(cwd).defaultBranch || "main";
  const run = (cmd: string) => execSync(cmd, { cwd, encoding: "utf8" }).trim();

  assertNoOpenAgentPr(issue, cwd);

  run(`git checkout ${base}`);
  run(`git pull origin ${base}`);
  run(`git checkout -b ${branch}`);
  run(`git commit --allow-empty -m "chore: open work on issue #${issue}"`);
  run(`git push -u origin ${branch}`);

  const prUrl = run(
    `gh pr create --draft --title ${JSON.stringify(title)} --body ${JSON.stringify(`Closes #${issue}`)} --base ${base}`
  );
  const prNumber = parseInt(prUrl.split("/").pop() ?? "", 10);
  if (Number.isNaN(prNumber)) {
    throw new Error(`Could not parse PR number from: ${prUrl}`);
  }

  writeState(
    {
      phase: "WORKSPACE",
      issue,
      prNumber,
      branch,
      changeName: "",
      ciFixes: 0,
      blocked: false,
    },
    cwd
  );
  syncPrState(prNumber, cwd);

  return prNumber;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [issue, branch, ...titleParts] = process.argv.slice(2);
  if (!issue || !branch || titleParts.length === 0) {
    console.error(
      "Usage: tsx scripts/setup-workspace.ts <issue> <branch> <title...>"
    );
    process.exit(1);
  }
  try {
    const prNumber = setupWorkspace({
      issue: parseInt(issue, 10),
      branch,
      title: titleParts.join(" "),
    });
    console.log(`Draft PR #${prNumber} created on branch ${branch}.`);
  } catch (err) {
    console.error((err as Error).message);
    process.exit(1);
  }
}
