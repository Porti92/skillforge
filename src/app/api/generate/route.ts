import { streamText } from "ai";
import { getGenerationModel } from "@/lib/ai-provider";

export async function POST(req: Request) {
  const { description, skillComplexity, targetAgent } = await req.json();

  const systemPrompt = `You are an expert at creating AI agent skills.

Generate a complete SKILL.md file based on the user's description.

Structure:
---
name: skill-name
description: One-line description
---

# Skill Name

What this skill does.

## When to Use
- Trigger conditions

## Usage
Step-by-step instructions.

## Examples
User: "example"
Agent: [response]

## Error Handling
| Error | Solution |
|-------|----------|
| Issue | Fix |

## Configuration
- API_KEY: Required for...

${skillComplexity === 'full' ? 'Include helper scripts if needed.' : 'Keep it simple.'}`;

  try {
    const result = await streamText({
      model: getGenerationModel(),
      system: systemPrompt,
      prompt: `Create a skill for: "${description}"`,
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error("Error generating skill:", error);
    return new Response("Failed to generate skill", { status: 500 });
  }
}
