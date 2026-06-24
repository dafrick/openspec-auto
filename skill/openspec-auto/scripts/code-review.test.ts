import assert from "node:assert/strict";
import { describe, test } from "node:test";

// Minimal conformance check: a code-review output is conformant if it contains
// a **Proof:** block. This documents the required format; the orchestrator
// relies on this block to post the Test Evidence PR comment.
function hasProofBlock(output: string): boolean {
  return /\*\*Proof:\*\*/.test(output);
}

describe("code-review output format", () => {
  test("output without **Proof:** block is non-conformant", () => {
    const fixture = `**Status:** APPROVED\nLooks good.\n`;
    assert.equal(hasProofBlock(fixture), false);
  });

  test("output with **Proof:** block is conformant", () => {
    const fixture = [
      "**Status:** APPROVED",
      "",
      "**Proof:**",
      "- Tests run: npm test",
      "- CI state: green",
      "- Verification: none",
      "- Caveats: none",
    ].join("\n");
    assert.equal(hasProofBlock(fixture), true);
  });

  test("CHANGES_REQUESTED output also requires **Proof:** block", () => {
    const withoutProof = [
      "**Status:** CHANGES_REQUESTED",
      "",
      "Blocking (in-scope):",
      "- Missing test coverage",
    ].join("\n");
    assert.equal(hasProofBlock(withoutProof), false);

    const withProof = withoutProof + "\n\n**Proof:**\n- Tests run: npm test\n- CI state: green\n- Verification: none\n- Caveats: none";
    assert.equal(hasProofBlock(withProof), true);
  });
});
