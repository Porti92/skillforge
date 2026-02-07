import { generateObject } from "ai";
import { z } from "zod";
import { getStructuredModel } from "@/lib/ai-provider";

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
    ? `The user wants a FULL skill with scripts and config templates. Recommend robust options.`
    : `The user wants a SIMPLE skill. Recommend straightforward options.`;

  const systemPrompt = `You are an expert at creating AI agent skills.

Generate 3-5 multiple-choice questions to clarify how to build the best skill for the user.

${complexityInstruction}

Each question should:
- Be clear and easy to understand (non-technical users!)
- Have 2-4 simple options
- Include recommendedIndex (0-based) for the best option

Focus on:
- What triggers the skill (user request, automatic, scheduled)
- What external services/APIs it needs
- What output format is expected
- Basic error handling approach

Keep questions SHORT and SIMPLE. Avoid technical jargon.`;

  try {
    const result = await generateObject({
      model: getStructuredModel(),
      schema: QuestionsResponseSchema,
      system: systemPrompt,
      prompt: `Skill idea: "${prompt}"

Generate 3-5 simple questions to clarify what this skill should do.`,
    });

    return Response.json(result.object);
  } catch (error) {
    console.error("Error generating questions:", error);
    return new Response("Failed to generate questions. Please check API configuration.", { status: 500 });
  }
}
