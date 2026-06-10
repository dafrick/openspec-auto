import { execSync } from "node:child_process";
import { writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

/**
 * Read a PR's current description body.
 */
export function readPrBody(prNumber: number, cwd = process.cwd()): string {
  return execSync(`gh pr view ${prNumber} --json body -q .body`, {
    encoding: "utf8",
    cwd,
  }).trim();
}

/**
 * Set a PR's description body. Writes through a temp file and `--body-file`
 * so markdown containing quotes, backticks, or `$` can't break shell quoting.
 */
export function editPrBody(prNumber: number, body: string, cwd = process.cwd()): void {
  const tmp = join(tmpdir(), `osl-pr-${prNumber}-${Date.now()}.md`);
  writeFileSync(tmp, body, "utf8");
  try {
    execSync(`gh pr edit ${prNumber} --body-file ${JSON.stringify(tmp)}`, { cwd });
  } finally {
    rmSync(tmp, { force: true });
  }
}
