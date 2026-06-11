export type Phase =
  | "WORKSPACE"
  | "EXPLORE"
  | "NEEDS_INPUT"
  | "PROPOSE"
  | "PROPOSAL_REVIEW"
  | "IMPLEMENT"
  | "CODE_REVIEW"
  | "IN_REVIEW"
  | "CI_BLOCKED";

export const VALID_PHASES: Phase[] = [
  "WORKSPACE",
  "EXPLORE",
  "NEEDS_INPUT",
  "PROPOSE",
  "PROPOSAL_REVIEW",
  "IMPLEMENT",
  "CODE_REVIEW",
  "IN_REVIEW",
  "CI_BLOCKED",
];

export interface AgentState {
  phase: Phase;
  issue: number;
  prNumber: number;
  branch: string;
  changeName: string;
  ciFixes: number;
  blocked: boolean;
}
