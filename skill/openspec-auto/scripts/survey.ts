import { execSync } from "node:child_process";
import { VALID_PHASES, type Phase } from "./types.js";

/**
 * Surveys the repo in one shot: open issues (most-recently-updated first),
 * each joined to its associated agent PR via GitHub's linked-PR graph
 * (`closedByPullRequestsReferences` — the PRs whose body says "Closes #N").
 * No two-list join, no per-issue calls. Triage reasons over the result.
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
interface GqlPr {
  number: number;
  body: string;
  comments: { nodes: GqlComment[] };
}
interface GqlIssue {
  number: number;
  title: string;
  body: string;
  updatedAt: string;
  labels: { nodes: { name: string }[] };
  comments: { nodes: GqlComment[] };
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

const QUERY = `query($owner:String!,$name:String!){repository(owner:$owner,name:$name){issues(states:OPEN,first:50,orderBy:{field:UPDATED_AT,direction:DESC}){nodes{number title body updatedAt labels(first:20){nodes{name}} comments(first:50){nodes{author{login} body createdAt}} closedByPullRequestsReferences(first:10,includeClosedPrs:false){nodes{number body comments(first:50){nodes{author{login} createdAt}}}}}}}}`;

export function survey(cwd = process.cwd()): SurveyRow[] {
  const nameWithOwner = execSync(
    "gh repo view --json nameWithOwner -q .nameWithOwner",
    { cwd, encoding: "utf8" }
  ).trim();
  const [owner, name] = nameWithOwner.split("/");
  const out = execSync(
    `gh api graphql -f query='${QUERY}' -f owner=${owner} -f name=${name}`,
    { cwd, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 }
  );
  return buildTable(JSON.parse(out).data.repository.issues.nodes);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    console.log(JSON.stringify(survey(), null, 2));
  } catch (err) {
    console.error((err as Error).message);
    process.exit(1);
  }
}
