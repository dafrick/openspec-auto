import { execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync, appendFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { input } from "@inquirer/prompts";
import type { LoopConfig } from "./config-types.js";

const CONFIG_FILE = ".openspec-auto.json";
const GITIGNORE_ENTRIES = [".openspec-auto.json", ".openspec-auto/"];

export function inferReviewer(): string {
  try {
    const out = execSync("gh repo view --json owner -q .owner.login", {
      encoding: "utf8",
    }).trim();
    return out || "";
  } catch {
    return "";
  }
}

export function inferDefaultBranch(): string {
  try {
    const out = execSync(
      "gh repo view --json defaultBranchRef -q .defaultBranchRef.name",
      { encoding: "utf8" }
    ).trim();
    return out || "main";
  } catch {
    return "main";
  }
}

function checkGhCli(): boolean {
  try {
    execSync("gh --version", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function updateGitignore(cwd: string): void {
  const gitignorePath = join(cwd, ".gitignore");
  const existing = existsSync(gitignorePath)
    ? readFileSync(gitignorePath, "utf8")
    : "";
  const toAdd = GITIGNORE_ENTRIES.filter((e) => !existing.includes(e));
  if (toAdd.length === 0) return;
  appendFileSync(gitignorePath, toAdd.map((e) => `\n${e}`).join("") + "\n");
  console.log(`\nAdded to .gitignore: ${toAdd.join(", ")}`);
}

export type InputFn = (config: { message: string; default?: string }) => Promise<string>;

export async function main(
  inferReviewerFn: () => string = inferReviewer,
  inferDefaultBranchFn: () => string = inferDefaultBranch,
  inputFn: InputFn = input
): Promise<void> {
  console.log("openspec-auto init\n");

  const { values } = parseArgs({
    args: process.argv.slice(2),
    options: {
      yes: { type: "boolean", short: "y", default: false },
      reviewer: { type: "string" },
      branch: { type: "string" },
    },
    strict: false,
  });

  const nonInteractive =
    values.yes === true ||
    values.reviewer !== undefined ||
    values.branch !== undefined;

  if (nonInteractive) {
    const resolvedReviewer =
      typeof values.reviewer === "string" ? values.reviewer : inferReviewerFn();
    const resolvedBranch =
      typeof values.branch === "string" ? values.branch : inferDefaultBranchFn();

    if (!resolvedReviewer) {
      console.error(
        "Error: could not infer reviewer. Pass --reviewer <handle> explicitly or ensure `gh` is authenticated."
      );
      process.exit(1);
    }

    const cwd = process.cwd();
    const configPath = join(cwd, CONFIG_FILE);

    let existing: LoopConfig = { reviewer: "", defaultBranch: "main" };
    if (existsSync(configPath)) {
      try {
        existing = JSON.parse(readFileSync(configPath, "utf8")) as LoopConfig;
      } catch {
        /* ignore malformed existing config */
      }
    }

    const config: LoopConfig = {
      ...existing,
      reviewer: resolvedReviewer,
      defaultBranch: resolvedBranch,
    };
    writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n", "utf8");
    console.log(`\nConfig written to ${CONFIG_FILE}`);

    updateGitignore(cwd);

    console.log("\nSetup complete. Run your loop with: /loop /openspec-auto");
    return;
  }

  // Interactive path (unchanged)
  if (!checkGhCli()) {
    console.warn(
      "Warning: `gh` CLI not found on PATH. Install and authenticate it before using openspec-auto.\n"
    );
  }

  const inferredReviewer = inferReviewerFn();

  const reviewer = await inputFn({
    message: "GitHub reviewer handle",
    default: inferredReviewer || undefined,
  });

  const defaultBranch = await inputFn({
    message: "Default branch",
    default: inferDefaultBranchFn(),
  });

  const cwd = process.cwd();
  const configPath = join(cwd, CONFIG_FILE);

  let existing: LoopConfig = { reviewer: "", defaultBranch: "main" };
  if (existsSync(configPath)) {
    try {
      existing = JSON.parse(readFileSync(configPath, "utf8")) as LoopConfig;
    } catch {
      /* ignore malformed existing config */
    }
  }

  const config: LoopConfig = { ...existing, reviewer, defaultBranch };
  writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n", "utf8");
  console.log(`\nConfig written to ${CONFIG_FILE}`);

  updateGitignore(cwd);

  console.log("\nSetup complete. Run your loop with: /loop /openspec-auto");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
