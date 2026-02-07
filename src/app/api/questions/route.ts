import { generateObject } from "ai";
import { z } from "zod";
import { getStructuredModel } from "@/lib/ai-provider";

const QuestionSchema = z.object({
  question: z.string(),
  options: z.array(z.string()).min(2).max(5),
  recommendedIndex: z.number().min(0).max(4),
});

const ConfigFieldSchema = z.object({
  id: z.string().describe("Unique identifier like 'website_url' or 'api_key'"),
  label: z.string().describe("Human-readable label like 'Website URL'"),
  placeholder: z.string().describe("Example value like 'https://example.com'"),
  type: z.enum(["text", "url", "password", "number", "email"]).describe("Input type"),
  required: z.boolean().describe("Whether this field is required"),
  description: z.string().optional().describe("Help text explaining what this is for"),
});

const QuestionsResponseSchema = z.object({
  questions: z.array(QuestionSchema).min(3).max(5),
  configFields: z.array(ConfigFieldSchema).describe("Configuration values the skill needs from the user"),
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

Generate 3-5 multiple-choice questions AND configuration fields needed for the skill.

${complexityInstruction}

## Questions (3-5)
Each question should:
- Be clear and easy to understand (non-technical users!)
- Have 2-4 simple options
- Include recommendedIndex (0-based) for the best option

Focus on:
- What triggers the skill (user request, automatic, scheduled)
- What external services/APIs it needs
- What output format is expected
- Basic error handling approach

Keep questions SHORT and SIMPLE. Avoid technical jargon.

## Configuration Fields (0-5)
Detect specific values the skill needs to work. Examples:
- Website URL to monitor → { id: "website_url", label: "Website URL", type: "url", placeholder: "https://example.com", required: true }
- API key → { id: "api_key", label: "API Key", type: "password", placeholder: "sk-...", required: true }
- Email to notify → { id: "notification_email", label: "Email for notifications", type: "email", placeholder: "you@example.com", required: false }
- Check interval → { id: "interval_minutes", label: "Check every (minutes)", type: "number", placeholder: "30", required: true }

Only include config fields for values that:
1. Are specific to the user's use case (not generic like "skill name")
2. Cannot be reasonably defaulted
3. Are referenced in the skill idea (URLs, names, credentials, etc.)

If the skill doesn't need specific configuration, return an empty array.`;

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
