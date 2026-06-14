import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  rmSync,
  readFileSync,
  existsSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { main, type InputFn } from "./init.js";

// Save and restore process state around each test
let originalCwd: string;
let originalArgv: string[];
let originalExit: typeof process.exit;
let exitCode: number | undefined;
let tmp: string;

beforeEach(() => {
  originalCwd = process.cwd();
  originalArgv = process.argv.slice();
  exitCode = undefined;

  // Stub process.exit so we can capture exit codes without stopping the process
  originalExit = process.exit;
  (process as NodeJS.Process & { exit: (code?: number) => never }).exit = (
    code?: number
  ) => {
    exitCode = code ?? 0;
    throw new Error(`process.exit(${exitCode})`);
  };

  // Create a temp dir and chdir into it for each test
  tmp = mkdtempSync(join(tmpdir(), "osl-init-"));
  process.chdir(tmp);
  // Reset argv to avoid leaking flags across tests
  process.argv = ["node", "init.ts"];
});

afterEach(() => {
  process.chdir(originalCwd);
  process.argv = originalArgv;
  (process as NodeJS.Process & { exit: (code?: number) => never }).exit =
    originalExit;
  rmSync(tmp, { recursive: true, force: true });
});

describe("init --yes (non-interactive happy path)", () => {
  test("writes .openspec-auto.json with inferred values when --yes is set", async () => {
    process.argv = ["node", "init.ts", "--yes"];

    await main(
      () => "inferred-reviewer",
      () => "main"
    );

    const configPath = join(tmp, ".openspec-auto.json");
    assert.ok(existsSync(configPath), ".openspec-auto.json should be written");
    const config = JSON.parse(readFileSync(configPath, "utf8"));
    assert.equal(config.reviewer, "inferred-reviewer");
    assert.equal(config.defaultBranch, "main");
  });

  test("exits zero (no error thrown) when inference succeeds with --yes", async () => {
    process.argv = ["node", "init.ts", "--yes"];
    // Should not throw
    await assert.doesNotReject(() =>
      main(
        () => "reviewer-handle",
        () => "main"
      )
    );
    assert.equal(exitCode, undefined, "process.exit should not have been called");
  });
});

describe("init --yes with empty reviewer inference", () => {
  test("exits non-zero and does NOT write config when reviewer is empty", async () => {
    process.argv = ["node", "init.ts", "--yes"];

    await assert.rejects(
      () =>
        main(
          () => "", // empty inference
          () => "main"
        ),
      /process\.exit\(1\)/
    );

    assert.equal(exitCode, 1, "should exit with code 1");
    assert.ok(
      !existsSync(join(tmp, ".openspec-auto.json")),
      ".openspec-auto.json must NOT be written on failure"
    );
  });
});

describe("init --reviewer and --branch flags", () => {
  test("writes explicit reviewer and branch without calling inference functions", async () => {
    process.argv = [
      "node",
      "init.ts",
      "--reviewer",
      "explicit-reviewer",
      "--branch",
      "develop",
    ];

    let inferReviewerCalled = false;
    let inferBranchCalled = false;

    await main(
      () => {
        inferReviewerCalled = true;
        return "should-not-be-used";
      },
      () => {
        inferBranchCalled = true;
        return "should-not-be-used";
      }
    );

    assert.equal(inferReviewerCalled, false, "inferReviewer should not be called when --reviewer is explicit");
    assert.equal(inferBranchCalled, false, "inferDefaultBranch should not be called when --branch is explicit");

    const config = JSON.parse(readFileSync(join(tmp, ".openspec-auto.json"), "utf8"));
    assert.equal(config.reviewer, "explicit-reviewer");
    assert.equal(config.defaultBranch, "develop");
  });
});

describe("init --reviewer alone (single-flag non-interactive)", () => {
  test("activates non-interactive mode with --reviewer alone, uses inferred branch", async () => {
    process.argv = ["node", "init.ts", "--reviewer", "explicit-reviewer"];

    let inferBranchCalled = false;

    await main(
      () => "should-not-be-used",
      () => {
        inferBranchCalled = true;
        return "inferred-branch";
      }
    );

    assert.equal(inferBranchCalled, true, "inferDefaultBranch should be called when --branch is not supplied");

    const config = JSON.parse(readFileSync(join(tmp, ".openspec-auto.json"), "utf8"));
    assert.equal(config.reviewer, "explicit-reviewer");
    assert.equal(config.defaultBranch, "inferred-branch");
  });
});

describe("init --branch alone (single-flag non-interactive)", () => {
  test("activates non-interactive mode with --branch alone, uses inferred reviewer", async () => {
    process.argv = ["node", "init.ts", "--branch", "develop"];

    let inferReviewerCalled = false;

    await main(
      () => {
        inferReviewerCalled = true;
        return "inferred-reviewer";
      },
      () => "should-not-be-used"
    );

    assert.equal(inferReviewerCalled, true, "inferReviewer should be called when --reviewer is not supplied");

    const config = JSON.parse(readFileSync(join(tmp, ".openspec-auto.json"), "utf8"));
    assert.equal(config.reviewer, "inferred-reviewer");
    assert.equal(config.defaultBranch, "develop");
  });
});

describe("init --reviewer bare flag (no value)", () => {
  test("falls back to inference and exits 1 when inference returns empty string", async () => {
    // `--reviewer` with no value: parseArgs gives values.reviewer === true (boolean)
    // The narrowing fix treats this as "not a string", so it falls through to inferReviewerFn()
    process.argv = ["node", "init.ts", "--reviewer"];

    await assert.rejects(
      () =>
        main(
          () => "", // inference returns empty → should trigger error
          () => "main"
        ),
      /process\.exit\(1\)/
    );

    assert.equal(exitCode, 1, "should exit with code 1 when reviewer cannot be resolved");
    assert.ok(
      !existsSync(join(tmp, ".openspec-auto.json")),
      ".openspec-auto.json must NOT be written with a bare --reviewer flag and empty inference"
    );
  });

  test("falls back to inference and writes config when inference returns a valid string", async () => {
    // `--reviewer` with no value: narrowing fix falls back to inferReviewerFn()
    // If inference succeeds, the config should be written with the inferred value
    process.argv = ["node", "init.ts", "--reviewer"];

    await main(
      () => "inferred-reviewer",
      () => "main"
    );

    assert.equal(exitCode, undefined, "process.exit should not have been called on success");

    const configPath = join(tmp, ".openspec-auto.json");
    assert.ok(existsSync(configPath), ".openspec-auto.json should be written when inference succeeds");
    const config = JSON.parse(readFileSync(configPath, "utf8"));
    assert.equal(config.reviewer, "inferred-reviewer", "config must contain the inferred reviewer string, not a boolean");
    assert.equal(typeof config.reviewer, "string", "reviewer must be a string, not boolean");
  });
});

describe("init interactive path (no flags)", () => {
  test("without --yes or --reviewer+--branch flags, main() calls input() for both prompts", async () => {
    process.argv = ["node", "init.ts"];

    const promptsReceived: string[] = [];

    // Mock inputFn to record calls and return preset values
    const mockInput: InputFn = async ({ message, default: def }) => {
      promptsReceived.push(message);
      // Return the default value as if the user just pressed Enter
      return def ?? "";
    };

    await main(
      () => "inferred-reviewer",
      () => "main",
      mockInput
    );

    // Both prompts should have been shown
    assert.ok(
      promptsReceived.some((m) => m.toLowerCase().includes("reviewer")),
      "should have prompted for reviewer"
    );
    assert.ok(
      promptsReceived.some((m) => m.toLowerCase().includes("branch")),
      "should have prompted for branch"
    );

    // Config should be written with the values returned by the mock prompts
    const config = JSON.parse(readFileSync(join(tmp, ".openspec-auto.json"), "utf8"));
    assert.equal(config.reviewer, "inferred-reviewer");
    assert.equal(config.defaultBranch, "main");
  });
});
