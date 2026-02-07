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
    configValues: Record<string, string>;
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
  const configValues = parsedBody.configValues || {};

  const isInitial = !messages || messages.length === 0;

  const responseFormatInstruction = `
RESPONSE FORMAT:
1. Brief conversational message (1-2 sentences)
2. Delimiter: ---SKILL_START---
3. Files in this exact format:

===FILE: path/to/file.ext===
file content here
===FILE: another/file.ext===
another file content
===END_FILES===

Example:
Great! Here's a web scraping skill with a helper script.

---SKILL_START---
===FILE: SKILL.md===
---
name: web-scraper
description: Scrape web pages
---

# Web Scraper

Instructions here...
===FILE: scripts/scrape.py===
#!/usr/bin/env python3
import requests
# script content
===END_FILES===`;

  const skillTemplate = `
# Skill Structure

ALWAYS output files using the ===FILE: path=== format.

## Required: SKILL.md
\`\`\`markdown
---
name: skill-name
description: One-line description
---

# Skill Name

What this skill does and when to use it.

## When to Use
- Trigger condition 1
- Trigger condition 2

## Usage
Step-by-step instructions the agent should follow.

## Examples
User: "example request"
Agent: [what the agent does/responds]

## Error Handling
Common errors and how to handle them.

## Configuration
Required environment variables or settings.
\`\`\`

## Optional: Scripts (scripts/*.py, scripts/*.sh)
Include executable scripts for complex operations like API calls, data processing, etc.

## Optional: config.json
Default configuration values.

IMPORTANT: Use actual values, not placeholders like [URL] or [API_KEY]. If a specific value is needed but not provided, use a sensible example or ask in SKILL.md to configure it.
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

${skillComplexity === 'full' ? 'Include helper scripts (scripts/*.py or scripts/*.sh) for complex operations.' : 'Keep it simple - usually just SKILL.md unless scripts are truly needed.'}

Generate a complete, working skill.`;

  let userPrompt: string;

  if (structuredAnswers && originalPrompt) {
    const answersText = Object.entries(structuredAnswers)
      .map(([index, answer]) => `Q${parseInt(index) + 1}: ${answer}`)
      .join('\n');

    const configText = Object.keys(configValues).length > 0
      ? `\n\nConfiguration values (USE THESE EXACT VALUES in the skill):\n${Object.entries(configValues)
          .map(([key, value]) => `- ${key}: ${value}`)
          .join('\n')}`
      : '';

    userPrompt = `Create skill for: "${originalPrompt}"

Answers:
${answersText}${configText}

IMPORTANT: If configuration values are provided above, embed them directly in the skill files. Do NOT use placeholders like [URL] or [API_KEY] - use the actual values provided.

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
    const model = getGenerationModel();
    const result = await streamText({
      model,
      system: systemPrompt,
      prompt: userPrompt,
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error("Error generating skill:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(`Error: ${errorMessage}`, { status: 500 });
  }
}
