export type SkillComplexity = "simple" | "full";

export const SKILL_COMPLEXITY_OPTIONS = [
  {
    value: "simple" as const,
    label: "Simple",
    description: "Just SKILL.md — quick and focused",
    disabled: false,
  },
  {
    value: "full" as const,
    label: "Full",
    description: "SKILL.md + scripts + configs",
    disabled: false,
  },
];

// Legacy exports for compatibility during transition
export type SpecMode = SkillComplexity;
export const SPEC_MODE_OPTIONS = SKILL_COMPLEXITY_OPTIONS;
