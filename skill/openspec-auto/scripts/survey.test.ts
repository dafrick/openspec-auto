import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { parseAgentState, buildTable } from "./survey.js";

const marker = (obj: object) => `<!-- agent-state: ${JSON.stringify(obj)} -->`;

describe("parseAgentState", () => {
  test("extracts a valid marker", () => {
    const body = `Closes #1\n\n## Agent Status\n\n${marker({ phase: "IMPLEMENT", issue: 1, blocked: false })}`;
    const state = parseAgentState(body);
    assert.equal(state?.phase, "IMPLEMENT");
    assert.equal(state?.blocked, false);
  });

  test("returns null when no marker", () => {
    assert.equal(parseAgentState("just a normal PR body"), null);
  });

  test("returns null on invalid phase", () => {
    assert.equal(parseAgentState(marker({ phase: "BOGUS", blocked: false })), null);
  });

  test("returns null on malformed JSON", () => {
    assert.equal(parseAgentState("<!-- agent-state: {not json} -->"), null);
  });
});

const issue = (over: Partial<Record<string, unknown>> = {}) => ({
  number: 1,
  title: "Fix the thing",
  body: "repro steps",
  updatedAt: "2026-01-01T00:00:00Z",
  labels: { nodes: [{ name: "bug" }] },
  comments: { nodes: [] },
  closedByPullRequestsReferences: { nodes: [] },
  ...over,
});

describe("buildTable", () => {
  test("issue with no PR → agentPr null", () => {
    const rows = buildTable([issue() as never]);
    assert.equal(rows[0].agentPr, null);
    assert.deepEqual(rows[0].labels, ["bug"]);
  });

  test("joins the linked agent PR and parses its state", () => {
    const rows = buildTable([
      issue({
        closedByPullRequestsReferences: {
          nodes: [
            {
              number: 7,
              body: marker({ phase: "REVIEW", issue: 1, blocked: false }),
              comments: { nodes: [{ author: { login: "alice" }, createdAt: "2026-01-02T00:00:00Z" }] },
            },
          ],
        },
      }) as never,
    ]);
    assert.equal(rows[0].agentPr?.number, 7);
    assert.equal(rows[0].agentPr?.phase, "REVIEW");
    assert.equal(rows[0].agentPr?.comments[0].author, "alice");
  });

  test("surfaces reviewDecision and CHANGES_REQUESTED review bodies", () => {
    const rows = buildTable([
      issue({
        closedByPullRequestsReferences: {
          nodes: [
            {
              number: 7,
              body: marker({ phase: "IN-REVIEW", issue: 1, blocked: false }),
              comments: { nodes: [] },
              reviewDecision: "CHANGES_REQUESTED",
              latestReviews: {
                nodes: [
                  { state: "CHANGES_REQUESTED", body: "rename the field", author: { login: "bob" } },
                  { state: "COMMENTED", body: "nit", author: { login: "carol" } },
                ],
              },
            },
          ],
        },
      }) as never,
    ]);
    assert.equal(rows[0].agentPr?.reviewDecision, "CHANGES_REQUESTED");
    assert.deepEqual(rows[0].agentPr?.changeRequests, [
      { author: "bob", body: "rename the field" },
    ]);
  });

  test("ignores linked PRs without an agent-state marker", () => {
    const rows = buildTable([
      issue({
        closedByPullRequestsReferences: {
          nodes: [{ number: 9, body: "a human PR", comments: { nodes: [] } }],
        },
      }) as never,
    ]);
    assert.equal(rows[0].agentPr, null);
  });

  test("preserves issue order from the query", () => {
    const rows = buildTable([issue({ number: 3 }) as never, issue({ number: 1 }) as never]);
    assert.deepEqual(rows.map((r) => r.issue), [3, 1]);
  });
});
