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
 * Set a PR's description body via the REST API.
 *
 * We deliberately avoid `gh pr edit`: it queries the PR's `projectCards` field,
 * which fails with a hard error now that Projects (classic) is deprecated, even
 * for an unrelated body update. The REST PATCH endpoint doesn't touch that field.
 *
 * The body is passed as a JSON request payload through `--input` (a temp file)
 * so markdown containing quotes, backticks, or `$` can't break shell quoting.
 */
export function editPrBody(prNumber: number, body: string, cwd = process.cwd()): void {
  const tmp = join(tmpdir(), `osl-pr-${prNumber}-${Date.now()}.json`);
  writeFileSync(tmp, JSON.stringify({ body }), "utf8");
  try {
    execSync(
      `gh api repos/{owner}/{repo}/pulls/${prNumber} --method PATCH --input ${JSON.stringify(tmp)} --silent`,
      { cwd },
    );
  } finally {
    rmSync(tmp, { force: true });
  }
}
