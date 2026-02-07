"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { TextShimmerWave } from "@/components/ui/text-shimmer-wave";
import NoiseBackground from "@/components/ui/noise-background";
import { cn } from "@/lib/utils";

interface Question {
  question: string;
  options: string[];
  recommendedIndex?: number;
}

interface InteractiveQuestionFlowProps {
  questions: Question[];
  onComplete: (answers: Record<number, string>) => void;
}

export function InteractiveQuestionFlow({
  questions,
  onComplete,
}: InteractiveQuestionFlowProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showOtherInput, setShowOtherInput] = useState(false);
  const [otherText, setOtherText] = useState("");
  const otherInputRef = useRef<HTMLInputElement>(null);

  const currentQuestion = questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === questions.length - 1;

  const handleSelectOption = async (option: string) => {
    if (isTransitioning) return;

    setSelectedOption(option);
    setIsTransitioning(true);

    // Store the answer
    const newAnswers = { ...answers, [currentQuestionIndex]: option };
    setAnswers(newAnswers);

    // Wait for animation
    await new Promise((resolve) => setTimeout(resolve, 400));

    if (isLastQuestion) {
      // Complete the flow
      onComplete(newAnswers);
    } else {
      // Move to next question
      setCurrentQuestionIndex((prev) => prev + 1);
      setSelectedOption(null);
      setIsTransitioning(false);
      setShowOtherInput(false);
      setOtherText("");
    }
  };

  const handleOtherClick = () => {
    if (isTransitioning) return;
    setShowOtherInput(true);
    setTimeout(() => otherInputRef.current?.focus(), 100);
  };

  const handleOtherSubmit = () => {
    if (otherText.trim()) {
      handleSelectOption(otherText.trim());
    }
  };

  const handleOtherKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && otherText.trim()) {
      handleOtherSubmit();
    } else if (e.key === "Escape") {
      setShowOtherInput(false);
      setOtherText("");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 sm:px-6 py-8 relative">
      <NoiseBackground />
      <div className="w-full max-w-xl relative z-10 overflow-hidden">
        <AnimatePresence mode="wait">
          {currentQuestionIndex === 0 && !isTransitioning && (
            <motion.div
              key="title"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              className="mb-8 text-center"
            >
              <h2 className="font-serif text-2xl font-medium text-zinc-100">
                First, let's clarify a few things
              </h2>
              <p className="mt-2 text-base text-zinc-500">
                {questions.length} quick questions to help us generate the perfect prompt
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          <motion.div
            key={`question-${currentQuestionIndex}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-5"
          >
            {/* Question counter */}
            <div className="text-center">
              <p className="mb-2 text-xs text-zinc-500">
                Question {currentQuestionIndex + 1}/{questions.length}
              </p>
              <h3 className="text-xl font-medium text-zinc-100">
                {currentQuestion.question}
              </h3>
            </div>

            {/* Options */}
            <div className="grid gap-2">
              {currentQuestion.options.map((option, index) => {
                const isRecommended = currentQuestion.recommendedIndex === index;
                const isSelected = selectedOption === option;

                return (
                  <motion.div
                    key={option}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2, delay: index * 0.05 }}
                  >
                    <Button
                      onClick={() => handleSelectOption(option)}
                      disabled={isTransitioning}
                      className={cn(
                        "w-full justify-start text-left h-auto py-3 px-4 text-sm font-normal transition-all",
                        isSelected
                          ? "bg-amber-600 text-zinc-950 scale-[0.98]"
                          : isRecommended
                            ? "bg-zinc-800/70 text-zinc-200 border-2 border-amber-600/50 hover:bg-zinc-800 hover:text-zinc-100 hover:border-amber-600/70"
                            : "bg-zinc-800/50 text-zinc-200 hover:bg-zinc-800 hover:text-zinc-100 border border-zinc-700 hover:border-zinc-600"
                      )}
                      variant={isSelected ? "default" : "outline"}
                    >
                      <span className="flex flex-col sm:flex-row sm:items-center sm:justify-between w-full gap-1.5 sm:gap-2">
                        <span className="flex-1">{option}</span>
                        {isRecommended && !isSelected && (
                          <Badge
                            variant="outline"
                            className="text-amber-500 border-amber-500/50 text-xs shrink-0 bg-transparent w-fit"
                          >
                            Recommended
                          </Badge>
                        )}
                      </span>
                    </Button>
                  </motion.div>
                );
              })}

              {/* Other option */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2, delay: currentQuestion.options.length * 0.05 }}
              >
                <AnimatePresence mode="wait">
                  {showOtherInput ? (
                    <motion.div
                      key="input"
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      className="flex gap-2"
                    >
                      <Input
                        ref={otherInputRef}
                        value={otherText}
                        onChange={(e) => setOtherText(e.target.value)}
                        onKeyDown={handleOtherKeyDown}
                        placeholder="Type your answer..."
                        className="flex-1 h-auto py-2.5 px-4 text-sm bg-zinc-800/50 border-zinc-700 text-zinc-200 placeholder:text-zinc-500 focus:border-amber-600 focus:ring-amber-600/20"
                        disabled={isTransitioning}
                      />
                      <Button
                        onClick={handleOtherSubmit}
                        disabled={isTransitioning || !otherText.trim()}
                        className="h-auto py-2.5 px-4 text-sm bg-amber-600 hover:bg-amber-500 text-zinc-950 disabled:opacity-50"
                      >
                        Submit
                      </Button>
                    </motion.div>
                  ) : (
                    <motion.div key="button">
                      <Button
                        onClick={handleOtherClick}
                        disabled={isTransitioning}
                        className="w-full justify-start text-left h-auto py-2.5 px-4 text-sm font-normal transition-all bg-transparent text-zinc-400 hover:bg-zinc-800/30 hover:text-zinc-300 border border-dashed border-zinc-700 hover:border-zinc-600"
                        variant="outline"
                      >
                        Other (specify your own)
                      </Button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </div>

            {/* Navigation hint */}
            <p className="text-center text-sm text-zinc-600">
              Select an option to continue
            </p>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

const loadingMessages = [
  "Thinking...",
  "Getting your vision in line...",
  "Crafting the perfect questions...",
  "Almost there...",
];

export function InteractiveQuestionFlowLoader() {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % loadingMessages.length);
    }, 2500); // Change message every 2.5 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center relative">
      <NoiseBackground />
      <AnimatePresence mode="wait">
        <motion.div
          key={messageIndex}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.5 }}
        >
          <TextShimmerWave
            as="h2"
            className="font-serif text-xl font-medium [--base-color:#fbbf24] [--base-gradient-color:#fef3c7] dark:[--base-color:#f59e0b] dark:[--base-gradient-color:#fef3c7]"
            duration={1.5}
            spread={1.5}
          >
            {loadingMessages[messageIndex]}
          </TextShimmerWave>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
