import { streamText } from "ai";
import { getGenerationModel } from "@/lib/ai-provider";

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

  const responseFormatInstruction = `
RESPONSE FORMAT:
1. Brief conversational message (1-2 sentences)
2. Delimiter: ---SKILL_START---
3. Complete skill package

Example:
Great! I'll create a weather skill for your agent.

---SKILL_START---
[skill content]`;

  const skillTemplate = `
# Skill Structure

## SKILL.md (Required)
\`\`\`markdown
---
name: skill-name
description: One-line description
---

# Skill Name

What this skill does and when to use it.

## When to Use
- Trigger 1
- Trigger 2

## Usage
Step-by-step instructions.

## Examples
\`\`\`
User: "example"
Agent: [response]
\`\`\`

## Error Handling
| Error | Solution |
|-------|----------|
| API timeout | Retry |

## Configuration
- \`API_KEY\`: Required
\`\`\`

For multiple files, use:
===FILE: SKILL.md===
[content]
===FILE: scripts/helper.sh===
[content]
`;

  const systemPrompt = `You are an expert at creating AI agent skills — reusable capability packages.

${responseFormatInstruction}

${skillTemplate}

Key principles:
- Clear triggers (when to use)
- Simple step-by-step instructions
- Error handling
- Examples for testing
- Environment variables for secrets

${skillComplexity === 'full' ? 'Include helper scripts and config templates.' : 'Keep it simple - just SKILL.md.'}

Generate a complete, working skill.`;

  let userPrompt: string;

  if (structuredAnswers && originalPrompt) {
    const answersText = Object.entries(structuredAnswers)
      .map(([index, answer]) => `Q${parseInt(index) + 1}: ${answer}`)
      .join('\n');

    userPrompt = `Create skill for: "${originalPrompt}"

Answers:
${answersText}

Generate the complete skill now.`;
  } else if (isInitial) {
    userPrompt = `Create a skill for: "${prompt}"

Generate the complete skill package.`;
  } else {
    userPrompt = `Feedback: ${prompt}

Current skill:
${currentSpec}

Update and output the complete revised skill.`;
  }

  try {
    const result = await streamText({
      model: getGenerationModel(),
      system: systemPrompt,
      prompt: userPrompt,
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error("Error generating skill:", error);
    return new Response("Failed to generate skill. Please check API configuration.", { status: 500 });
  }
}
