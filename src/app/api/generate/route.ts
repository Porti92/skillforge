import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";

export async function POST(req: Request) {
  const { description, skillComplexity, targetAgent } = await req.json();

  const complexityNote = skillComplexity === 'full' 
    ? "Generate a comprehensive skill with helper scripts and config templates."
    : "Generate a focused SKILL.md file.";

  const systemPrompt = `You are an expert at creating AI agent skills — reusable capability packages that give AI assistants new abilities.

Your task is to generate a complete skill package based on the user's description.

${complexityNote}

A skill package includes:

1. **SKILL.md** - The main instruction file with:
   - Frontmatter (name, description, requirements)
   - When to use this skill
   - Step-by-step instructions
   - Examples
   - Error handling
   - Configuration options

2. **Scripts** (optional, for full skills) - Helper scripts for complex operations

3. **Config templates** (optional) - .env.example or config templates

Output format:
\`\`\`
===FILE: SKILL.md===
[content]

===FILE: scripts/helper.sh===
[content if needed]

===FILE: .env.example===
[content if needed]
\`\`\`

Generate a production-ready skill that:
- Has clear trigger conditions (when to use)
- Includes practical examples
- Handles errors gracefully
- Uses environment variables for secrets
- Is easy to install and use`;

  const result = streamText({
    model: openai("gpt-4o"),
    system: systemPrompt,
    prompt: `Create a skill for this capability:\n\n${description}\n\nTarget Agent: ${targetAgent || 'openclaw'}\nComplexity: ${skillComplexity || 'simple'}`,
  });

  return result.toTextStreamResponse();
}
