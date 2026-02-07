import { anthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";
import { google } from "@ai-sdk/google";

// Get the best available model for generation (check at runtime)
export function getGenerationModel() {
  const hasGoogle = !!process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  const hasAnthropic = !!process.env.ANTHROPIC_API_KEY;
  const hasOpenAI = !!process.env.OPENAI_API_KEY;

  // Prefer Anthropic
  if (hasAnthropic) {
    return anthropic("claude-3-haiku-20240307");
  }
  if (hasGoogle) {
    return google("gemini-2.0-flash");
  }
  if (hasOpenAI) {
    return openai("gpt-4o");
  }
  throw new Error("No AI provider configured.");
}

// Get model for structured output (questions)
export function getStructuredModel() {
  const hasGoogle = !!process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  const hasAnthropic = !!process.env.ANTHROPIC_API_KEY;
  const hasOpenAI = !!process.env.OPENAI_API_KEY;

  // Prefer Anthropic
  if (hasAnthropic) {
    return anthropic("claude-3-haiku-20240307");
  }
  if (hasGoogle) {
    return google("gemini-2.0-flash");
  }
  if (hasOpenAI) {
    return openai("gpt-4o");
  }
  throw new Error("No AI provider configured.");
}
