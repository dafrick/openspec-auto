import { execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync, appendFileSync } from "node:fs";
import { join } from "node:path";
import { input } from "@inquirer/prompts";
import type { LoopConfig } from "./config-types.js";

const CONFIG_FILE = ".openspec-loop.json";
const GITIGNORE_ENTRIES = [".openspec-loop.json", ".openspec-loop/"];
const REQUIRED_SKILLS = ["opsx:explore", "opsx:propose", "opsx:apply", "opsx:archive"];

function inferReviewer(): string {
  try {
    const out = execSync("gh repo view --json owner -q .owner.login", {
      encoding: "utf8",
    }).trim();
    return out || "";
  } catch {
    return "";
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

function checkSkills(): string[] {
  const skillsDir = join(process.env.HOME ?? "~", ".claude", "skills");
  return REQUIRED_SKILLS.filter((skill) => {
    const skillDir = join(skillsDir, skill);
    return !existsSync(skillDir);
  });
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

async function main(): Promise<void> {
  console.log("openspec-loop init\n");

  if (!checkGhCli()) {
    console.warn(
      "Warning: `gh` CLI not found on PATH. Install and authenticate it before using openspec-loop.\n"
    );
  }

  const missingSkills = checkSkills();
  if (missingSkills.length > 0) {
    console.warn(
      `Warning: Missing OpenSpec skills: ${missingSkills.join(", ")}\n` +
        `Install them from https://github.com/dafrick/openspec-auto\n`
    );
  }

  const inferredReviewer = inferReviewer();

  const reviewer = await input({
    message: "GitHub reviewer handle",
    default: inferredReviewer || undefined,
  });

  const cwd = process.cwd();
  const configPath = join(cwd, CONFIG_FILE);

  let existing: LoopConfig = { reviewer: "" };
  if (existsSync(configPath)) {
    try {
      existing = JSON.parse(readFileSync(configPath, "utf8")) as LoopConfig;
    } catch {
      /* ignore malformed existing config */
    }
  }

  const config: LoopConfig = { ...existing, reviewer };
  writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n", "utf8");
  console.log(`\nConfig written to ${CONFIG_FILE}`);

  updateGitignore(cwd);

  console.log("\nSetup complete. Run your loop with: /loop /openspec-loop");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
