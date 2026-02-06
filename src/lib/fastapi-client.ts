/**
 * FastAPI client for communicating with the backend server.
 *
 * Provides typed methods for calling the FastAPI endpoints
 * with proper authentication and error handling.
 */

// Feature flag to enable/disable FastAPI backend
export const USE_FASTAPI = process.env.NEXT_PUBLIC_USE_FASTAPI === "true";

// FastAPI backend URL
const FASTAPI_URL = process.env.NEXT_PUBLIC_FASTAPI_URL || "http://localhost:8000";

// API key for authentication (server-side only)
const FASTAPI_API_KEY = process.env.FASTAPI_API_KEY || "";

/**
 * Structured answer from the question flow.
 */
export interface StructuredAnswer {
  questionId: string;
  answer: string;
}

/**
 * Chat request body.
 */
export interface ChatRequest {
  prompt: string;
  messages?: Array<{ role: "user" | "assistant"; content: string }>;
  currentSpec?: string;
  productType?: string;
  platform?: string;
  structuredAnswers?: StructuredAnswer[];
  originalPrompt?: string;
  specMode?: string;
  targetAgent?: string;
}

/**
 * Questions request body.
 */
export interface QuestionsRequest {
  prompt: string;
  productType?: string;
  platform?: string;
  specMode?: string;
  targetAgent?: string;
}

/**
 * Question response from the API.
 */
export interface Question {
  id: string;
  question: string;
  options: string[];
  recommendedIndex: number;
  required: boolean;
}

/**
 * Questions response from the API.
 */
export interface QuestionsResponse {
  questionSetVersion: number;
  contractVersion: number;
  questions: Question[];
}

/**
 * SSE event types from the chat endpoint.
 */
export type SSEEventType = "token" | "delimiter" | "ping" | "done" | "error";

/**
 * SSE event from the chat endpoint.
 */
export interface SSEEvent {
  event: SSEEventType;
  data: string;
}

/**
 * Base fetch function with authentication.
 */
async function fetchFromFastAPI(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const url = `${FASTAPI_URL}${endpoint}`;

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  // Add API key if available (for server-side calls)
  if (FASTAPI_API_KEY) {
    (headers as Record<string, string>)["X-API-Key"] = FASTAPI_API_KEY;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok && response.status !== 200) {
    const errorText = await response.text();
    throw new Error(`FastAPI error: ${response.status} - ${errorText}`);
  }

  return response;
}

/**
 * Generate clarifying questions for a product idea.
 */
export async function generateQuestions(
  request: QuestionsRequest
): Promise<QuestionsResponse> {
  const response = await fetchFromFastAPI("/api/v1/questions", {
    method: "POST",
    body: JSON.stringify({
      prompt: request.prompt,
      productType: request.productType,
      platform: request.platform,
      specMode: request.specMode || "mvp",
      targetAgent: request.targetAgent,
    }),
  });

  return response.json();
}

/**
 * Stream chat completion from the FastAPI backend.
 *
 * Returns an async generator that yields SSE events.
 */
export async function* streamChat(
  request: ChatRequest
): AsyncGenerator<SSEEvent, void, unknown> {
  const response = await fetchFromFastAPI("/api/v1/chat", {
    method: "POST",
    body: JSON.stringify({
      prompt: request.prompt,
      messages: request.messages || [],
      currentSpec: request.currentSpec,
      productType: request.productType,
      platform: request.platform,
      structuredAnswers: request.structuredAnswers,
      originalPrompt: request.originalPrompt,
      specMode: request.specMode || "mvp",
      targetAgent: request.targetAgent,
    }),
  });

  if (!response.body) {
    throw new Error("No response body");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        // Process any remaining data in buffer
        if (buffer.trim()) {
          const events = parseSSEBuffer(buffer);
          for (const event of events) {
            yield event;
          }
        }
        break;
      }

      buffer += decoder.decode(value, { stream: true });

      // Process complete events from buffer
      const events = parseSSEBuffer(buffer);
      for (const event of events) {
        yield event;

        // Remove processed event from buffer
        const eventStr = `event: ${event.event}\ndata: ${event.data}\n\n`;
        const index = buffer.indexOf(eventStr);
        if (index !== -1) {
          buffer = buffer.slice(index + eventStr.length);
        }
      }

      // Keep only the last incomplete event in buffer
      const lastEventEnd = buffer.lastIndexOf("\n\n");
      if (lastEventEnd !== -1) {
        buffer = buffer.slice(lastEventEnd + 2);
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * Parse SSE buffer into events.
 */
function parseSSEBuffer(buffer: string): SSEEvent[] {
  const events: SSEEvent[] = [];
  const lines = buffer.split("\n");

  let currentEvent: Partial<SSEEvent> = {};

  for (const line of lines) {
    if (line.startsWith("event: ")) {
      currentEvent.event = line.slice(7) as SSEEventType;
    } else if (line.startsWith("data: ")) {
      currentEvent.data = line.slice(6);
    } else if (line === "" && currentEvent.event) {
      // Empty line marks end of event
      events.push({
        event: currentEvent.event,
        data: currentEvent.data || "",
      });
      currentEvent = {};
    }
  }

  return events;
}

/**
 * Check if FastAPI backend is available.
 */
export async function checkFastAPIHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${FASTAPI_URL}/health`, {
      method: "GET",
    });
    return response.ok;
  } catch {
    return false;
  }
}
