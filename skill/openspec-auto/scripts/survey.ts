import { execSync } from "node:child_process";
import { type Phase, VALID_PHASES } from "./types.js";

/**
 * Surveys the repo in one shot: open issues (most-recently-updated first),
 * each joined to its associated agent PR via GitHub's linked-PR graph
 * (`closedByPullRequestsReferences` — the PRs whose body says "Closes #N").
 * Closed PRs are excluded (`includeClosedPrs:false`): a closed agent PR is an
 * abandoned attempt, so its issue is treated as fresh work again.
 * No two-list join, no per-issue calls. Triage reasons over the result.
 *
 * Comments are paginated to completion — issue and PR comment threads can run
 * past one page, and the resume signals (a human's answer after the agent's
 * blocking-questions comment) and the explore/propose context need all of them.
 */

export interface SurveyComment {
  author: string;
  createdAt: string;
  body?: string;
}

export interface AgentPr {
  number: number;
  phase: Phase;
  blocked: boolean;
  comments: SurveyComment[];
}

export interface SurveyRow {
  issue: number;
  title: string;
  body: string;
  updatedAt: string;
  labels: string[];
  comments: SurveyComment[];
  agentPr: AgentPr | null;
}

/** Extract and validate the agent-state marker from a PR body, or null. */
export function parseAgentState(
  body: string
): { phase: Phase; blocked: boolean; [k: string]: unknown } | null {
  const m = body.match(/<!-- agent-state:\s*(\{.*?\})\s*-->/);
  if (!m) return null;
  let parsed: { phase?: unknown; blocked?: unknown };
  try {
    parsed = JSON.parse(m[1]);
  } catch {
    return null;
  }
  if (!VALID_PHASES.includes(parsed.phase as Phase)) return null;
  return parsed as { phase: Phase; blocked: boolean };
}

interface GqlComment {
  author: { login: string } | null;
  createdAt: string;
  body?: string;
}
interface GqlCommentConnection {
  nodes: GqlComment[];
  pageInfo: { hasNextPage: boolean; endCursor: string | null };
}
interface GqlPr {
  id: string;
  number: number;
  body: string;
  comments: GqlCommentConnection;
}
interface GqlIssue {
  id: string;
  number: number;
  title: string;
  body: string;
  updatedAt: string;
  labels: { nodes: { name: string }[] };
  comments: GqlCommentConnection;
  closedByPullRequestsReferences: { nodes: GqlPr[] };
}

const mapComments = (nodes: GqlComment[]): SurveyComment[] =>
  nodes.map((c) => ({
    author: c.author?.login ?? "",
    createdAt: c.createdAt,
    ...(c.body !== undefined ? { body: c.body } : {}),
  }));

/** Pure transform: GraphQL issue nodes → the survey table. */
export function buildTable(issues: GqlIssue[]): SurveyRow[] {
  return issues.map((iss) => {
    let agentPr: AgentPr | null = null;
    for (const pr of iss.closedByPullRequestsReferences.nodes) {
      const state = parseAgentState(pr.body);
      if (state) {
        agentPr = {
          number: pr.number,
          phase: state.phase,
          blocked: state.blocked,
          comments: mapComments(pr.comments.nodes),
        };
        break;
      }
    }
    return {
      issue: iss.number,
      title: iss.title,
      body: iss.body,
      updatedAt: iss.updatedAt,
      labels: iss.labels.nodes.map((l) => l.name),
      comments: mapComments(iss.comments.nodes),
      agentPr,
    };
  });
}

const COMMENT_FIELDS = `nodes{author{login} body createdAt} pageInfo{hasNextPage endCursor}`;
const QUERY = `query($owner:String!,$name:String!){repository(owner:$owner,name:$name){issues(states:OPEN,first:50,orderBy:{field:UPDATED_AT,direction:DESC}){nodes{id number title body updatedAt labels(first:20){nodes{name}} comments(first:100){${COMMENT_FIELDS}} closedByPullRequestsReferences(first:50,includeClosedPrs:false){nodes{id number body comments(first:100){${COMMENT_FIELDS}}}}}}}}`;

const PAGE_QUERY = `query($id:ID!,$cursor:String!){node(id:$id){... on Issue{comments(first:100,after:$cursor){${COMMENT_FIELDS}}}... on PullRequest{comments(first:100,after:$cursor){${COMMENT_FIELDS}}}}}`;

function gql(
  query: string,
  vars: Record<string, string>,
  cwd: string
): unknown {
  const args = Object.entries(vars)
    .map(([k, v]) => `-f ${k}=${JSON.stringify(v)}`)
    .join(" ");
  const out = execSync(`gh api graphql -f query='${query}' ${args}`, {
    cwd,
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  });
  return JSON.parse(out);
}

/** Page a single node's (Issue or PR) comment thread to completion. */
function fetchRemainingComments(
  id: string,
  startCursor: string,
  cwd: string
): GqlComment[] {
  const all: GqlComment[] = [];
  let cursor: string | null = startCursor;
  while (cursor) {
    const data = gql(PAGE_QUERY, { id, cursor }, cwd) as {
      data: { node: { comments: GqlCommentConnection } };
    };
    const conn = data.data.node.comments;
    all.push(...conn.nodes);
    cursor = conn.pageInfo.hasNextPage ? conn.pageInfo.endCursor : null;
  }
  return all;
}

/** Append every comment past the first page, in place, for an issue or PR. */
function topUpComments(
  node: { id: string; comments: GqlCommentConnection },
  cwd: string
): void {
  const { pageInfo } = node.comments;
  if (pageInfo.hasNextPage && pageInfo.endCursor) {
    node.comments.nodes.push(
      ...fetchRemainingComments(node.id, pageInfo.endCursor, cwd)
    );
  }
}

export function survey(cwd = process.cwd()): SurveyRow[] {
  const nameWithOwner = execSync(
    "gh repo view --json nameWithOwner -q .nameWithOwner",
    { cwd, encoding: "utf8" }
  ).trim();
  const [owner, name] = nameWithOwner.split("/");
  const data = gql(QUERY, { owner, name }, cwd) as {
    data: { repository: { issues: { nodes: GqlIssue[] } } };
  };
  const issues = data.data.repository.issues.nodes;
  for (const iss of issues) {
    topUpComments(iss, cwd);
    for (const pr of iss.closedByPullRequestsReferences.nodes) {
      topUpComments(pr, cwd);
    }
  }
  return buildTable(issues);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    console.log(JSON.stringify(survey(), null, 2));
  } catch (err) {
    console.error((err as Error).message);
    process.exit(1);
  }
}
