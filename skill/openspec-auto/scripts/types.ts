export type Phase =
  | "WORKSPACE"
  | "EXPLORE"
  | "NEEDS-INPUT"
  | "PROPOSE"
  | "IMPLEMENT"
  | "REVIEW"
  | "COMPLETE"
  | "CI-BLOCKED";

export const VALID_PHASES: Phase[] = [
  "WORKSPACE",
  "EXPLORE",
  "NEEDS-INPUT",
  "PROPOSE",
  "IMPLEMENT",
  "REVIEW",
  "COMPLETE",
  "CI-BLOCKED",
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
