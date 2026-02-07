import { anthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";

// Check which API keys are available
const hasAnthropic = !!process.env.ANTHROPIC_API_KEY;
const hasOpenAI = !!process.env.OPENAI_API_KEY;

// Get the best available model for generation
export function getGenerationModel() {
  if (hasAnthropic) {
    return anthropic("claude-sonnet-4-20250514");
  }
  if (hasOpenAI) {
    return openai("gpt-4o");
  }
  throw new Error("No AI provider configured. Set ANTHROPIC_API_KEY or OPENAI_API_KEY.");
}

// Get model for structured output (questions)
export function getStructuredModel() {
  if (hasAnthropic) {
    return anthropic("claude-sonnet-4-20250514");
  }
  if (hasOpenAI) {
    return openai("gpt-4o");
  }
  throw new Error("No AI provider configured. Set ANTHROPIC_API_KEY or OPENAI_API_KEY.");
}

export { hasAnthropic, hasOpenAI };
