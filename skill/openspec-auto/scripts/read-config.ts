import { appendFileSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { LoopConfig } from "./config-types.js";

const CONFIG_FILE = ".openspec-auto.json";
const GITIGNORE_ENTRIES = [".openspec-auto.json", ".openspec-auto/"];

export function readConfig(cwd = process.cwd()): LoopConfig {
  const file = join(cwd, CONFIG_FILE);
  if (!existsSync(file)) {
    throw new Error(
      `Config not found. Run \`npx openspec-auto init\` to set up.`
    );
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(file, "utf8"));
  } catch {
    throw new Error(
      `Config file at ${file} contains invalid JSON. Run \`npx openspec-auto init\` to recreate it.`
    );
  }
  const config = parsed as LoopConfig;
  if (!config.reviewer || typeof config.reviewer !== "string") {
    throw new Error(
      `Config at ${file} is missing a valid "reviewer" field. Run \`npx openspec-auto init\` to fix it.`
    );
  }
  ensureGitignoreEntry(cwd);
  return config;
}

function ensureGitignoreEntry(cwd: string): void {
  const gitignore = join(cwd, ".gitignore");
  if (!existsSync(gitignore)) return;
  const contents = readFileSync(gitignore, "utf8");
  const toAdd = GITIGNORE_ENTRIES.filter((e) => !contents.includes(e));
  if (toAdd.length > 0) {
    appendFileSync(gitignore, `${toAdd.map((e) => `\n${e}`).join("")}\n`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const config = readConfig();
    console.log(JSON.stringify(config, null, 2));
  } catch (err) {
    console.error((err as Error).message);
    process.exit(1);
  }
}
