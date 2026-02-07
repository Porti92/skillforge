"use client";

import { useState, useEffect, Suspense, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { InteractiveQuestionFlow, InteractiveQuestionFlowLoader } from "@/components/InteractiveQuestionFlow";
import { ConfigurationForm, ConfigField } from "@/components/ConfigurationForm";
import { USE_FASTAPI, generateQuestions } from "@/lib/fastapi-client";

interface Question {
  id?: string;
  question: string;
  options: string[];
  recommendedIndex?: number;
}

type FlowStep = "loading" | "questions" | "config";

interface FetchQuestionsResult {
  questions: Question[];
  configFields: ConfigField[];
}

/**
 * Fetch questions from the appropriate backend (FastAPI or Next.js API).
 */
async function fetchQuestions(params: {
  prompt: string;
  skillComplexity: string;
  targetAgent?: string;
}): Promise<FetchQuestionsResult> {
  if (USE_FASTAPI) {
    // Use FastAPI backend
    const response = await generateQuestions({
      prompt: params.prompt,
      skillComplexity: params.skillComplexity,
      targetAgent: params.targetAgent,
    });
    return {
      questions: response.questions.map((q) => ({
        id: q.id,
        question: q.question,
        options: q.options,
        recommendedIndex: q.recommendedIndex,
      })),
      configFields: [], // FastAPI doesn't support config fields yet
    };
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
    return {
      questions: data.questions || [],
      configFields: data.configFields || [],
    };
  }
}

function QuestionsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const description = searchParams.get("description") || "";
  const skillComplexity = searchParams.get("complexity") || "simple";
  const agent = searchParams.get("agent") || "";

  const [step, setStep] = useState<FlowStep>("loading");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [configFields, setConfigFields] = useState<ConfigField[]>([]);
  const [questionAnswers, setQuestionAnswers] = useState<Record<number, string>>({});
  const hasStartedRef = useRef(false);

  useEffect(() => {
    if (!description || hasStartedRef.current) return;
    hasStartedRef.current = true;

    fetchQuestions({
      prompt: description,
      skillComplexity,
      targetAgent: agent || undefined,
    })
      .then((result) => {
        setQuestions(result.questions);
        setConfigFields(result.configFields);
        setStep("questions");
      })
      .catch((err) => {
        console.error("Error loading questions:", err);
        // Fallback: go directly to chat
        const params = new URLSearchParams();
        params.set("description", description);
        params.set("skipQuestions", "true");
        router.replace(`/chat?${params.toString()}`);
      });
  }, [description, skillComplexity, agent, router]);

  const handleQuestionsComplete = (answers: Record<number, string>) => {
    setQuestionAnswers(answers);
    
    // If there are config fields, show config step
    if (configFields.length > 0) {
      setStep("config");
    } else {
      // No config needed, go directly to chat
      navigateToChat(answers, {});
    }
  };

  const handleConfigComplete = (configValues: Record<string, string>) => {
    navigateToChat(questionAnswers, configValues);
  };

  const handleConfigSkip = () => {
    navigateToChat(questionAnswers, {});
  };

  const navigateToChat = (answers: Record<number, string>, configValues: Record<string, string>) => {
    // Convert indexed answers to structured format
    const structuredAnswers = questions.length > 0
      ? Object.entries(answers).map(([index, answer]) => ({
          questionId: questions[parseInt(index)]?.id || `q${parseInt(index) + 1}`,
          answer,
        }))
      : [];

    // Store everything in sessionStorage to pass to chat page
    sessionStorage.setItem("questionAnswers", JSON.stringify({
      answers,
      structuredAnswers,
      configValues,
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
      {step === "loading" && <InteractiveQuestionFlowLoader />}
      
      {step === "questions" && questions.length > 0 && (
        <InteractiveQuestionFlow
          questions={questions}
          onComplete={handleQuestionsComplete}
        />
      )}
      
      {step === "config" && (
        <ConfigurationForm
          fields={configFields}
          onComplete={handleConfigComplete}
          onSkip={configFields.every(f => !f.required) ? handleConfigSkip : undefined}
        />
      )}
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
