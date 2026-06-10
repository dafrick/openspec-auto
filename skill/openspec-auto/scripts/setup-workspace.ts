import { execSync } from "node:child_process";
import { writeState } from "./write-state.js";
import { syncPrState } from "./sync-pr-state.js";
import { readConfig } from "./read-config.js";

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

  run(`git checkout ${base}`);
  run(`git pull origin ${base}`);
  run(`git checkout -b ${branch}`);
  run(`git commit --allow-empty -m "chore: open work on issue #${issue}"`);
  run(`git push -u origin ${branch}`);

  const prUrl = run(
    `gh pr create --draft --title ${JSON.stringify(title)} --body ${JSON.stringify(`Closes #${issue}`)} --base ${base}`
  );
  const prNumber = parseInt(prUrl.split("/").pop() ?? "", 10);
  if (isNaN(prNumber)) {
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
