import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { readConfig } from "./read-config.js";

describe("read-config", () => {
  let tmp: string;
  beforeEach(() => { tmp = mkdtempSync(join(tmpdir(), "osl-cfg-")); });
  afterEach(() => { rmSync(tmp, { recursive: true, force: true }); });

  test("throws when config file is absent", () => {
    assert.throws(() => readConfig(tmp), /Config not found/);
  });

  test("throws on invalid JSON", () => {
    writeFileSync(join(tmp, ".openspec-auto.json"), "bad json");
    assert.throws(() => readConfig(tmp), /invalid JSON/);
  });

  test("throws when reviewer field is missing", () => {
    writeFileSync(join(tmp, ".openspec-auto.json"), JSON.stringify({ other: "value" }));
    assert.throws(() => readConfig(tmp), /reviewer/);
  });

  test("returns config for valid file", () => {
    writeFileSync(
      join(tmp, ".openspec-auto.json"),
      JSON.stringify({ reviewer: "alice", extra: true })
    );
    const config = readConfig(tmp);
    assert.equal(config.reviewer, "alice");
    assert.equal(config.extra, true);
  });

  test("preserves additional fields", () => {
    writeFileSync(
      join(tmp, ".openspec-auto.json"),
      JSON.stringify({ reviewer: "bob", custom: "field" })
    );
    const config = readConfig(tmp);
    assert.equal(config.custom, "field");
  });
});

describe(".gitignore update logic", () => {
  let tmp: string;
  beforeEach(() => { tmp = mkdtempSync(join(tmpdir(), "osl-cfg-")); });
  afterEach(() => { rmSync(tmp, { recursive: true, force: true }); });

  test("adds .openspec-auto/ to .gitignore if missing", () => {
    writeFileSync(join(tmp, ".gitignore"), ".openspec-auto.json\n");
    writeFileSync(join(tmp, ".openspec-auto.json"), JSON.stringify({ reviewer: "alice" }));
    readConfig(tmp);
    const contents = readFileSync(join(tmp, ".gitignore"), "utf8");
    assert.ok(contents.includes(".openspec-auto/"));
  });

  test("does not duplicate .openspec-auto/ if already present", () => {
    writeFileSync(join(tmp, ".gitignore"), ".openspec-auto.json\n.openspec-auto/\n");
    writeFileSync(join(tmp, ".openspec-auto.json"), JSON.stringify({ reviewer: "alice" }));
    readConfig(tmp);
    const contents = readFileSync(join(tmp, ".gitignore"), "utf8");
    assert.equal(
      (contents.match(/\.openspec-auto\//g) ?? []).length,
      1
    );
  });

  test("no .gitignore present — skips silently", () => {
    writeFileSync(join(tmp, ".openspec-auto.json"), JSON.stringify({ reviewer: "alice" }));
    assert.doesNotThrow(() => readConfig(tmp));
  });
});
