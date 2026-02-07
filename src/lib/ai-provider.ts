import { anthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";
import { google } from "@ai-sdk/google";

// Get the best available model for generation (check at runtime)
export function getGenerationModel() {
  // Check env vars at runtime, not module load time
  const hasGoogle = !!process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  const hasAnthropic = !!process.env.ANTHROPIC_API_KEY;
  const hasOpenAI = !!process.env.OPENAI_API_KEY;

  // Prefer Anthropic (most reliable) - use claude-3-5-sonnet for SDK v2 compatibility
  if (hasAnthropic) {
    return anthropic("claude-3-5-sonnet-20241022");
  }
  if (hasGoogle) {
    return google("gemini-2.0-flash");
  }
  if (hasOpenAI) {
    return openai("gpt-4o");
  }
  throw new Error("No AI provider configured. Set ANTHROPIC_API_KEY, GOOGLE_GENERATIVE_AI_API_KEY, or OPENAI_API_KEY.");
}

// Get model for structured output (questions)
export function getStructuredModel() {
  // Check env vars at runtime, not module load time
  const hasGoogle = !!process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  const hasAnthropic = !!process.env.ANTHROPIC_API_KEY;
  const hasOpenAI = !!process.env.OPENAI_API_KEY;

  // Prefer Anthropic (most reliable) - use claude-3-5-sonnet for SDK v2 compatibility
  if (hasAnthropic) {
    return anthropic("claude-3-5-sonnet-20241022");
  }
  if (hasGoogle) {
    return google("gemini-2.0-flash");
  }
  if (hasOpenAI) {
    return openai("gpt-4o");
  }
  throw new Error("No AI provider configured. Set ANTHROPIC_API_KEY, GOOGLE_GENERATIVE_AI_API_KEY, or OPENAI_API_KEY.");
}

// Helper to check if providers are configured (also runtime)
export function hasAnthropicKey() {
  return !!process.env.ANTHROPIC_API_KEY;
}

export function hasOpenAIKey() {
  return !!process.env.OPENAI_API_KEY;
}

export function hasGoogleKey() {
  return !!process.env.GOOGLE_GENERATIVE_AI_API_KEY;
}
