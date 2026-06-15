import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { findDuplicateAgentPr } from "./setup-workspace.js";

const marker = (obj: object) => `<!-- agent-state: ${JSON.stringify(obj)} -->`;
const pr = (number: number, obj: object) => ({
  number,
  body: `Closes #${(obj as { issue?: number }).issue}\n\n${marker(obj)}`,
});

describe("findDuplicateAgentPr", () => {
  test("finds an open PR whose marker covers the issue", () => {
    const prs = [
      pr(7, { phase: "IMPLEMENT", issue: 42, blocked: false }),
      pr(8, { phase: "EXPLORE", issue: 43, blocked: false }),
    ];
    assert.equal(findDuplicateAgentPr(prs, 42), 7);
  });

  test("returns null when no marker covers the issue", () => {
    const prs = [pr(8, { phase: "EXPLORE", issue: 43, blocked: false })];
    assert.equal(findDuplicateAgentPr(prs, 42), null);
  });

  test("ignores PRs without an agent-state marker", () => {
    const prs = [{ number: 9, body: "a plain human PR, no marker" }];
    assert.equal(findDuplicateAgentPr(prs, 42), null);
  });

  test("ignores PRs whose marker has an invalid phase", () => {
    const prs = [pr(10, { phase: "BOGUS", issue: 42, blocked: false })];
    assert.equal(findDuplicateAgentPr(prs, 42), null);
  });
});
