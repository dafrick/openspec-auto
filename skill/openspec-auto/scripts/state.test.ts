import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { writeState } from "./write-state.js";
import { readState } from "./read-state.js";
import { renderPrBlock } from "./sync-pr-state.js";
import type { AgentState } from "./types.js";

const VALID_STATE: AgentState = {
  phase: "IMPLEMENT",
  issue: 42,
  prNumber: 7,
  branch: "fix/42-some-bug",
  changeName: "fix-some-bug",
  ciFixes: 1,
  blocked: false,
};

describe("write-state", () => {
  let tmp: string;
  beforeEach(() => { tmp = mkdtempSync(join(tmpdir(), "osl-")); });
  afterEach(() => { rmSync(tmp, { recursive: true, force: true }); });

  test("writes state.json with correct contents", () => {
    writeState(VALID_STATE, tmp);
    const raw = readFileSync(join(tmp, ".openspec-auto", "state.json"), "utf8");
    assert.deepEqual(JSON.parse(raw), VALID_STATE);
  });

  test("creates .openspec-auto directory if absent", () => {
    writeState(VALID_STATE, tmp);
    const raw = readFileSync(join(tmp, ".openspec-auto", "state.json"), "utf8");
    assert.ok(raw.length > 0);
  });

  test("rejects invalid phase", () => {
    const bad = { ...VALID_STATE, phase: "INVALID" } as unknown as AgentState;
    assert.throws(() => writeState(bad, tmp), /Invalid phase/);
  });

  test("does not write file on invalid phase", () => {
    const bad = { ...VALID_STATE, phase: "NOPE" } as unknown as AgentState;
    try { writeState(bad, tmp); } catch { /* expected */ }
    let exists = false;
    try { readFileSync(join(tmp, ".openspec-auto", "state.json")); exists = true; } catch { /* expected */ }
    assert.equal(exists, false);
  });

  test("round-trip: written state matches read-back state", () => {
    writeState(VALID_STATE, tmp);
    const recovered = readState(tmp);
    assert.deepEqual(recovered, VALID_STATE);
  });
});

describe("read-state", () => {
  let tmp: string;
  beforeEach(() => { tmp = mkdtempSync(join(tmpdir(), "osl-")); });
  afterEach(() => { rmSync(tmp, { recursive: true, force: true }); });

  test("throws when state file is absent", () => {
    assert.throws(() => readState(tmp), /State file not found/);
  });

  test("throws on invalid JSON", () => {
    mkdirSync(join(tmp, ".openspec-auto"), { recursive: true });
    writeFileSync(join(tmp, ".openspec-auto", "state.json"), "not json");
    assert.throws(() => readState(tmp), /invalid JSON/);
  });

  test("throws on invalid phase in file", () => {
    mkdirSync(join(tmp, ".openspec-auto"), { recursive: true });
    writeFileSync(
      join(tmp, ".openspec-auto", "state.json"),
      JSON.stringify({ ...VALID_STATE, phase: "BOGUS" })
    );
    assert.throws(() => readState(tmp), /invalid phase/i);
  });

  test("returns typed state for valid file", () => {
    writeState(VALID_STATE, tmp);
    const state = readState(tmp);
    assert.equal(state.phase, "IMPLEMENT");
    assert.equal(state.issue, 42);
  });
});

describe("sync-pr-state / renderPrBlock", () => {
  test("renders Agent Status table", () => {
    const block = renderPrBlock(VALID_STATE);
    assert.ok(block.includes("## Agent Status"));
    assert.ok(block.includes("| Phase | IMPLEMENT |"));
    assert.ok(block.includes("| Issue | #42 |"));
    assert.ok(block.includes("| PR | #7 |"));
    assert.ok(block.includes("| Blocked | no |"));
  });

  test("includes agent-state HTML comment", () => {
    const block = renderPrBlock(VALID_STATE);
    assert.ok(block.includes("<!-- agent-state:"));
    const match = block.match(/<!-- agent-state: ({.*?}) -->/);
    assert.ok(match);
    const parsed = JSON.parse(match![1]);
    assert.deepEqual(parsed, VALID_STATE);
  });

  test("rendered output is idempotent (same state → same block)", () => {
    assert.equal(renderPrBlock(VALID_STATE), renderPrBlock(VALID_STATE));
  });
});
