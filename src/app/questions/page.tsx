"use client";

import { useState, useEffect, Suspense, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { InteractiveQuestionFlow, InteractiveQuestionFlowLoader } from "@/components/InteractiveQuestionFlow";
import { USE_FASTAPI, generateQuestions } from "@/lib/fastapi-client";

interface Question {
  id?: string;
  question: string;
  options: string[];
  recommendedIndex?: number;
}

/**
 * Fetch questions from the appropriate backend (FastAPI or Next.js API).
 */
async function fetchQuestions(params: {
  prompt: string;
  skillComplexity: string;
  targetAgent?: string;
}): Promise<Question[]> {
  if (USE_FASTAPI) {
    // Use FastAPI backend
    const response = await generateQuestions({
      prompt: params.prompt,
      skillComplexity: params.skillComplexity,
      targetAgent: params.targetAgent,
    });
    return response.questions.map((q) => ({
      id: q.id,
      question: q.question,
      options: q.options,
      recommendedIndex: q.recommendedIndex,
    }));
  } else {
    // Use existing Next.js API
    const res = await fetch("/api/questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: params.prompt,
        skillComplexity: params.skillComplexity,
        targetAgent: params.targetAgent,
      }),
    });
    const data = await res.json();
    return data.questions;
  }
}

function QuestionsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const description = searchParams.get("description") || "";
  const skillComplexity = searchParams.get("complexity") || "simple";
  const agent = searchParams.get("agent") || "";

  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const hasStartedRef = useRef(false);

  useEffect(() => {
    if (!description || hasStartedRef.current) return;
    hasStartedRef.current = true;

    fetchQuestions({
      prompt: description,
      skillComplexity,
      targetAgent: agent || undefined,
    })
      .then((questions) => {
        setQuestions(questions);
      })
      .catch((err) => {
        console.error("Error loading questions:", err);
        // Fallback: go directly to chat
        const params = new URLSearchParams();
        params.set("description", description);
        params.set("skipQuestions", "true");
        router.replace(`/chat?${params.toString()}`);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [description, skillComplexity, agent, router]);

  const handleComplete = (answers: Record<number, string>) => {
    // Convert indexed answers to structured format for FastAPI
    // Store both formats for backward compatibility
    const structuredAnswers = questions
      ? Object.entries(answers).map(([index, answer]) => ({
          questionId: questions[parseInt(index)]?.id || `q${parseInt(index) + 1}`,
          answer,
        }))
      : [];

    // Store answers in sessionStorage to pass to chat page
    sessionStorage.setItem("questionAnswers", JSON.stringify({
      answers, // Keep original format for backward compatibility
      structuredAnswers, // New format for FastAPI
      description,
      skillComplexity,
      agent,
    }));

    const params = new URLSearchParams();
    params.set("fromQuestions", "true");
    if (agent) params.set("agent", agent);
    router.push(`/chat?${params.toString()}`);
  };

  if (!description) {
    router.replace("/");
    return null;
  }

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-zinc-100">
      {isLoading ? (
        <InteractiveQuestionFlowLoader />
      ) : questions ? (
        <InteractiveQuestionFlow
          questions={questions}
          onComplete={handleComplete}
        />
      ) : null}
    </div>
  );
}

export default function QuestionsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center bg-[#0a0a0b]">
          <Loader2 className="h-6 w-6 animate-spin text-zinc-600" />
        </div>
      }
    >
      <QuestionsContent />
    </Suspense>
  );
}
