/**
 * React hook for streaming chat completions from FastAPI backend.
 *
 * Provides similar API to useCompletion from @ai-sdk/react
 * but uses our custom FastAPI backend with typed SSE events.
 */

import { useCallback, useRef, useState } from "react";

import {
  ChatRequest,
  SSEEvent,
  streamChat,
} from "@/lib/fastapi-client";

export interface UseFastAPIStreamOptions {
  /**
   * Callback when streaming completes.
   */
  onFinish?: (prompt: string, completion: string) => void;

  /**
   * Callback when an error occurs.
   */
  onError?: (error: Error) => void;

  /**
   * Callback when the delimiter is received.
   */
  onDelimiter?: () => void;
}

export interface UseFastAPIStreamReturn {
  /**
   * The accumulated completion text.
   */
  completion: string;

  /**
   * Whether a request is in progress.
   */
  isLoading: boolean;

  /**
   * Any error that occurred.
   */
  error: Error | null;

  /**
   * Start a new completion request.
   */
  complete: (request: ChatRequest) => Promise<string>;

  /**
   * Stop the current request.
   */
  stop: () => void;

  /**
   * Reset the state.
   */
  reset: () => void;
}

/**
 * Hook for streaming chat completions from FastAPI.
 */
export function useFastAPIStream(
  options: UseFastAPIStreamOptions = {}
): UseFastAPIStreamReturn {
  const { onFinish, onError, onDelimiter } = options;

  const [completion, setCompletion] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Ref to track if we should stop
  const abortRef = useRef(false);
  // Ref to track the current prompt
  const promptRef = useRef("");

  const complete = useCallback(
    async (request: ChatRequest): Promise<string> => {
      setIsLoading(true);
      setError(null);
      setCompletion("");
      abortRef.current = false;
      promptRef.current = request.prompt;

      let fullCompletion = "";

      try {
        for await (const event of streamChat(request)) {
          // Check if we should stop
          if (abortRef.current) {
            break;
          }

          switch (event.event) {
            case "token":
              fullCompletion += event.data;
              setCompletion(fullCompletion);
              break;

            case "delimiter":
              onDelimiter?.();
              // Include delimiter in completion for parsing
              fullCompletion += event.data;
              setCompletion(fullCompletion);
              break;

            case "ping":
              // Heartbeat - ignore
              break;

            case "done":
              // Streaming complete
              break;

            case "error":
              throw new Error(event.data);
          }
        }

        setIsLoading(false);
        onFinish?.(promptRef.current, fullCompletion);
        return fullCompletion;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        setIsLoading(false);
        onError?.(error);
        throw error;
      }
    },
    [onFinish, onError, onDelimiter]
  );

  const stop = useCallback(() => {
    abortRef.current = true;
    setIsLoading(false);
  }, []);

  const reset = useCallback(() => {
    setCompletion("");
    setError(null);
    setIsLoading(false);
    abortRef.current = false;
  }, []);

  return {
    completion,
    isLoading,
    error,
    complete,
    stop,
    reset,
  };
}

/**
 * Parse completion text to extract message and spec content.
 *
 * The completion format is:
 * <conversational message>
 * ---SPEC_START---
 * <spec content>
 */
export function parseCompletion(completion: string): {
  message: string;
  spec: string;
} {
  const delimiter = "---SPEC_START---";
  const delimiterIndex = completion.indexOf(delimiter);

  if (delimiterIndex === -1) {
    // No delimiter yet - treat everything as message
    return {
      message: completion.trim(),
      spec: "",
    };
  }

  const message = completion.slice(0, delimiterIndex).trim();
  const spec = completion.slice(delimiterIndex + delimiter.length).trim();

  return { message, spec };
}
