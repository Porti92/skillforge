import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";

export const dynamic = 'force-dynamic';

export async function GET() {
  const results: Record<string, string> = {};
  
  // Test Anthropic
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const result = await generateText({
        model: anthropic("claude-3-haiku-20240307"),
        prompt: "Say hello in 3 words",
        maxTokens: 20,
      });
      results.anthropic = `SUCCESS: ${result.text}`;
    } catch (e) {
      results.anthropic = `ERROR: ${e instanceof Error ? e.message : String(e)}`;
    }
  } else {
    results.anthropic = "NO_KEY";
  }
  
  // Test Google
  if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    try {
      const result = await generateText({
        model: google("gemini-2.0-flash"),
        prompt: "Say hello in 3 words",
        maxTokens: 20,
      });
      results.google = `SUCCESS: ${result.text}`;
    } catch (e) {
      results.google = `ERROR: ${e instanceof Error ? e.message : String(e)}`;
    }
  } else {
    results.google = "NO_KEY";
  }
  
  return Response.json(results);
}
