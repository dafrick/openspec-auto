import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { buildTable, parseAgentState } from "./survey.js";

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
    assert.equal(
      parseAgentState(marker({ phase: "BOGUS", blocked: false })),
      null
    );
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
              body: marker({ phase: "CODE_REVIEW", issue: 1, blocked: false }),
              comments: {
                nodes: [
                  {
                    author: { login: "alice" },
                    createdAt: "2026-01-02T00:00:00Z",
                  },
                ],
              },
            },
          ],
        },
      }) as never,
    ]);
    assert.equal(rows[0].agentPr?.number, 7);
    assert.equal(rows[0].agentPr?.phase, "CODE_REVIEW");
    assert.equal(rows[0].agentPr?.comments[0].author, "alice");
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
    const rows = buildTable([
      issue({ number: 3 }) as never,
      issue({ number: 1 }) as never,
    ]);
    assert.deepEqual(
      rows.map((r) => r.issue),
      [3, 1]
    );
  });

  test("issue with no PR and no comments → agentIssueState null", () => {
    const rows = buildTable([issue() as never]);
    assert.equal(rows[0].agentIssueState, null);
  });

  test("issue comment with agent-state marker → agentIssueState populated", () => {
    const rows = buildTable([
      issue({
        comments: {
          nodes: [
            {
              author: { login: "bot" },
              createdAt: "2026-01-02T00:00:00Z",
              body: marker({ phase: "NEEDS_INPUT", issue: 1, blocked: true }),
            },
          ],
        },
      }) as never,
    ]);
    assert.equal(rows[0].agentIssueState?.phase, "NEEDS_INPUT");
    assert.equal(rows[0].agentIssueState?.blocked, true);
    assert.equal(rows[0].agentPr, null);
  });

  test("agentPr takes precedence: agentIssueState is null when agentPr is non-null", () => {
    const rows = buildTable([
      issue({
        comments: {
          nodes: [
            {
              author: { login: "bot" },
              createdAt: "2026-01-01T00:00:00Z",
              body: marker({ phase: "NEEDS_INPUT", issue: 1, blocked: true }),
            },
          ],
        },
        closedByPullRequestsReferences: {
          nodes: [
            {
              number: 5,
              body: marker({ phase: "IMPLEMENT", issue: 1, blocked: false }),
              comments: { nodes: [] },
            },
          ],
        },
      }) as never,
    ]);
    assert.equal(rows[0].agentPr?.phase, "IMPLEMENT");
    assert.equal(rows[0].agentIssueState, null);
  });

  test("comment without agent-state marker → agentIssueState null", () => {
    const rows = buildTable([
      issue({
        comments: {
          nodes: [
            {
              author: { login: "alice" },
              createdAt: "2026-01-02T00:00:00Z",
              body: "Can you look at this?",
            },
          ],
        },
      }) as never,
    ]);
    assert.equal(rows[0].agentIssueState, null);
  });

  test("comment with no body field → agentIssueState null (no crash)", () => {
    const rows = buildTable([
      issue({
        comments: {
          nodes: [
            { author: { login: "bot" }, createdAt: "2026-01-02T00:00:00Z" },
          ],
        },
      }) as never,
    ]);
    assert.equal(rows[0].agentIssueState, null);
  });
});
