import { anthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";
import { google } from "@ai-sdk/google";

// Get the best available model for generation (check at runtime)
export function getGenerationModel() {
  // Check env vars at runtime, not module load time
  const hasGoogle = !!process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  const hasAnthropic = !!process.env.ANTHROPIC_API_KEY;
  const hasOpenAI = !!process.env.OPENAI_API_KEY;

  // Prefer Google Gemini (free tier)
  if (hasGoogle) {
    return google("gemini-2.5-flash");
  }
  if (hasAnthropic) {
    return anthropic("claude-sonnet-4-20250514");
  }
  if (hasOpenAI) {
    return openai("gpt-4o");
  }
  throw new Error("No AI provider configured. Set GOOGLE_GENERATIVE_AI_API_KEY, ANTHROPIC_API_KEY, or OPENAI_API_KEY.");
}

// Get model for structured output (questions)
export function getStructuredModel() {
  // Check env vars at runtime, not module load time
  const hasGoogle = !!process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  const hasAnthropic = !!process.env.ANTHROPIC_API_KEY;
  const hasOpenAI = !!process.env.OPENAI_API_KEY;

  // Prefer Google Gemini (free tier)
  if (hasGoogle) {
    return google("gemini-2.5-flash");
  }
  if (hasAnthropic) {
    return anthropic("claude-sonnet-4-20250514");
  }
  if (hasOpenAI) {
    return openai("gpt-4o");
  }
  throw new Error("No AI provider configured. Set GOOGLE_GENERATIVE_AI_API_KEY, ANTHROPIC_API_KEY, or OPENAI_API_KEY.");
}

// Helper to check if providers are configured (also runtime)
export function hasAnthropic() {
  return !!process.env.ANTHROPIC_API_KEY;
}

export function hasOpenAI() {
  return !!process.env.OPENAI_API_KEY;
}

export function hasGoogle() {
  return !!process.env.GOOGLE_GENERATIVE_AI_API_KEY;
}
