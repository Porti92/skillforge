export type TargetAgent = {
  id: string;
  name: string;
  logo: string;
  description?: string;
};

export const TARGET_AGENTS: TargetAgent[] = [
  {
    id: "openclaw",
    name: "OpenClaw",
    logo: "/logos/openclaw.png",
    description: "OpenClaw agents (Henry, etc.)",
  },
  {
    id: "claude-code",
    name: "Claude Code",
    logo: "/logos/Claude_AI.png",
    description: "Anthropic's Claude Code CLI",
  },
  {
    id: "cursor",
    name: "Cursor",
    logo: "/logos/cursor.png",
    description: "Cursor AI IDE",
  },
  {
    id: "generic",
    name: "Generic",
    logo: "/logos/generic-agent.png",
    description: "Any AI agent with tool access",
  },
];

export const DEFAULT_AGENT = TARGET_AGENTS[0];

export function getAgentById(id: string): TargetAgent | undefined {
  return TARGET_AGENTS.find((agent) => agent.id === id);
}

// Legacy exports for compatibility
export type CodingAgent = TargetAgent;
export const CODING_AGENTS = TARGET_AGENTS;
