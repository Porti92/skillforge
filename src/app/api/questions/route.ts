import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";

const QuestionSchema = z.object({
  question: z.string(),
  options: z.array(z.string()).min(2).max(5),
  recommendedIndex: z.number().min(0).max(4),
});

const QuestionsResponseSchema = z.object({
  questions: z.array(QuestionSchema).min(3).max(5),
});

export async function POST(req: Request) {
  const rawBody = (await req.text()).trim();
  if (!rawBody) {
    return new Response("Missing request body", { status: 400 });
  }

  let parsedBody: Partial<{
    prompt: string;
    skillComplexity: string;
    targetAgent: string;
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

  const skillComplexity = typeof parsedBody.skillComplexity === "string" ? parsedBody.skillComplexity : "simple";
  const targetAgent = typeof parsedBody.targetAgent === "string" ? parsedBody.targetAgent : "openclaw";

  const complexityInstruction = skillComplexity === 'full'
    ? `The user wants a FULL skill with scripts, config templates, and comprehensive error handling. For each question, set recommendedIndex to the option that is more robust and complete.`
    : `The user wants a SIMPLE skill (primarily a SKILL.md file). For each question, set recommendedIndex to the option that is simpler and more straightforward.`;

  const systemPrompt = `You are an expert at creating AI agent skills — reusable capability packages that give AI assistants new abilities.

Your task is to generate 3-5 highly targeted multiple-choice questions that will help create the best possible skill for the user's needs.

${complexityInstruction}

Each question should:
- Focus on critical decisions that affect how the skill works
- Be clear and easy to understand
- Provide 2-5 specific, actionable options
- Include a recommendedIndex (0-based) indicating the best option for the user's complexity preference

Question categories to consider:

**External Dependencies**
- What CLI tools does this skill need? (curl, jq, ffmpeg, specific APIs)
- Does it require API keys or authentication?
- Are there rate limits or usage constraints to handle?

**Workflow & Triggers**
- When should the agent use this skill? (explicit request, automatic detection, scheduled)
- What's the typical input format? (natural language, structured data, files)
- What's the expected output? (text response, files, side effects)

**Error Handling**
- What can go wrong? (network failures, auth errors, invalid input)
- How should failures be communicated to the user?
- Should there be retry logic or fallbacks?

**Scope & Boundaries**
- Should the skill be read-only or can it make changes?
- What safety checks are needed?
- Are there actions that should require user confirmation?

**Configuration**
- What settings should be user-configurable?
- Are there environment-specific values (API endpoints, credentials)?
- Should the skill remember state between uses?

Make questions highly relevant to the specific skill idea provided. Focus on decisions that will significantly impact the skill's usefulness and reliability.`;

  try {
    const result = await generateObject({
      model: openai("gpt-4o"),
      schema: QuestionsResponseSchema,
      system: systemPrompt,
      prompt: `Generate clarifying questions for this skill idea:

Skill Description:
${prompt}

Target Agent: ${targetAgent}
Complexity: ${skillComplexity}

Generate 3-5 multiple-choice questions with 2-5 options each to help create the best possible skill.`,
    });

    return Response.json(result.object);
  } catch (error) {
    console.error("Error generating questions:", error);
    return new Response("Failed to generate questions", { status: 500 });
  }
}
