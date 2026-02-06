import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface StructuredAnswers {
  [questionIndex: number]: string;
}

export async function POST(req: Request) {
  const rawBody = (await req.text()).trim();
  if (!rawBody) {
    return new Response("Missing request body", { status: 400 });
  }

  let parsedBody: Partial<{
    prompt: string;
    messages: Message[];
    currentSpec: string;
    skillComplexity: string;
    targetAgent: string;
    structuredAnswers: StructuredAnswers;
    originalPrompt: string;
  }> = {};

  try {
    parsedBody = JSON.parse(rawBody);
  } catch {
    return new Response("Invalid JSON body", { status: 400 });
  }

  const prompt = typeof parsedBody.prompt === "string" ? parsedBody.prompt : "";
  if (!prompt) {
    return new Response("Prompt is required", { status: 400 });
  }

  const messages = Array.isArray(parsedBody.messages) ? parsedBody.messages : [];
  const currentSpec = typeof parsedBody.currentSpec === "string" ? parsedBody.currentSpec : "";
  const skillComplexity = typeof parsedBody.skillComplexity === "string" ? parsedBody.skillComplexity : "simple";
  const targetAgent = typeof parsedBody.targetAgent === "string" ? parsedBody.targetAgent : "openclaw";
  const structuredAnswers = parsedBody.structuredAnswers || null;
  const originalPrompt = typeof parsedBody.originalPrompt === "string" ? parsedBody.originalPrompt : "";

  const isInitial = !messages || messages.length === 0;

  const complexityInstruction = skillComplexity === 'full'
    ? `
SKILL COMPLEXITY: FULL
Generate a comprehensive skill package with:
- Complete SKILL.md with detailed instructions
- Helper scripts for complex operations
- Config templates for API keys and settings
- Comprehensive error handling and edge cases
- Usage examples and test scenarios
- Installation and setup instructions`
    : `
SKILL COMPLEXITY: SIMPLE
Generate a lean, focused skill with:
- Clear, concise SKILL.md
- Inline instructions (no separate scripts unless essential)
- Minimal configuration
- Core functionality only
- Easy to install and use immediately`;

  const responseFormatInstruction = `
CRITICAL RESPONSE FORMAT:
Your response MUST follow this exact structure:
1. First, write a brief conversational message (1-2 sentences) acknowledging the user's input
2. Then output the exact delimiter: ---SKILL_START---
3. Then output the complete skill package

Example format:
Great! I'll create a skill that lets your agent fetch weather data from any location.

---SKILL_START---
# SKILL.md content here...

ALWAYS include the conversational message and delimiter before the skill content.`;

  const skillStructureGuide = `
# Skill Package Structure

A complete skill package consists of:

## 1. SKILL.md (Required)
The main instruction file. Must include:

\`\`\`markdown
---
name: skill-name
description: One-line description for skill discovery
metadata:
  openclaw:
    emoji: "🔧"
    requires:
      bins: ["curl", "jq"]  # CLI tools needed
      env: ["API_KEY"]       # Environment variables needed
    install:
      - id: "setup"
        kind: "shell"
        command: "npm install something"
        label: "Install dependencies"
---

# Skill Name

Brief description of what this skill does and when the agent should use it.

## When to Use

- Trigger condition 1
- Trigger condition 2
- NOT for: things this skill shouldn't be used for

## Prerequisites

- Required API keys or credentials
- Required CLI tools
- Any setup steps

## Usage

### Basic Usage
Step-by-step instructions for the most common use case.

### Advanced Usage
More complex scenarios and options.

## Examples

### Example 1: [Scenario Name]
\\\`\\\`\\\`
User: "example request"
Agent: [what the agent should do]
\\\`\\\`\\\`

### Example 2: [Another Scenario]
\\\`\\\`\\\`
User: "another example"
Agent: [response]
\\\`\\\`\\\`

## Error Handling

| Error | Cause | Solution |
|-------|-------|----------|
| API timeout | Network issues | Retry with backoff |
| Auth failed | Invalid API key | Ask user to check credentials |

## Configuration

Settings the user can customize in TOOLS.md or environment:
- \`API_KEY\`: Required for authentication
- \`DEFAULT_OPTION\`: Optional, defaults to X

## Notes

- Important caveats
- Rate limits
- Security considerations
\`\`\`

## 2. Scripts (Optional, for full skills)
Helper scripts in a \`scripts/\` folder:
- \`scripts/fetch-data.sh\` — Shell scripts for complex operations
- \`scripts/process.py\` — Python scripts if needed

## 3. Config Templates (Optional)
- \`.env.example\` — Template for environment variables
- \`config.example.json\` — Template for configuration files

## 4. References (Optional)
- \`references/api-docs.md\` — Relevant API documentation
- \`references/examples.md\` — Extended examples
`;

  const systemPrompt = isInitial
    ? `You are an expert at creating AI agent skills — reusable capability packages that give AI assistants like OpenClaw, Claude Code, and similar agents new abilities.

${complexityInstruction}

${responseFormatInstruction}

${skillStructureGuide}

# Your Task

When a user describes a capability they want their agent to have, generate a complete, production-ready skill package.

## Key Principles

1. **Clear Triggers**: The agent must know WHEN to use this skill
2. **Step-by-Step**: Instructions should be unambiguous and sequential
3. **Error Resilience**: Anticipate what can go wrong and how to handle it
4. **Security First**: Never store secrets in skill files; use environment variables
5. **Testable**: Include examples the agent can use to verify the skill works

## What Makes a Great Skill

- **Focused**: Does one thing well
- **Self-Contained**: All instructions in one place
- **Defensive**: Handles edge cases gracefully
- **Documented**: Examples for every major use case
- **Maintainable**: Easy to update and extend

## Output Format

Generate the complete skill package as a single document with clear file separators:

\`\`\`
📁 skill-name/
├── SKILL.md
├── scripts/
│   └── helper.sh (if needed)
└── .env.example (if needed)
\`\`\`

Use this format to separate files:
\`\`\`
===FILE: SKILL.md===
[content]

===FILE: scripts/helper.sh===
[content]

===FILE: .env.example===
[content]
\`\`\`

Generate the skill now based on the user's description.`
    : `You are an expert at creating AI agent skills. You're helping iterate on a skill package.

${complexityInstruction}
${responseFormatInstruction}

Current skill content:
${currentSpec}

Your task:
1. If the user answered clarifying questions, generate the complete skill package
2. If the user is requesting changes, update the skill accordingly

${skillStructureGuide}

Output the complete updated skill package with all files.`;

  let userPrompt: string;

  if (structuredAnswers && originalPrompt) {
    const answersText = Object.entries(structuredAnswers)
      .map(([index, answer]) => `Q${parseInt(index) + 1}: ${answer}`)
      .join('\n');

    userPrompt = `The user has answered the clarifying questions. Generate the complete skill package.

Original Skill Idea:
${originalPrompt}

User's Answers:
${answersText}

Target Agent: ${targetAgent}
Complexity: ${skillComplexity}

Generate the complete skill package now.`;
  } else if (isInitial) {
    userPrompt = `Create a skill for this capability:

${prompt}

Target Agent: ${targetAgent}
Complexity: ${skillComplexity}

Generate the complete skill package.`;
  } else {
    userPrompt = `User feedback: ${prompt}

Update the skill based on this feedback and output the complete revised package.`;
  }

  const result = await streamText({
    model: openai("gpt-4o"),
    system: systemPrompt,
    prompt: userPrompt,
  });

  return result.toTextStreamResponse();
}
