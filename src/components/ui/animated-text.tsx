"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { cn } from "@/lib/utils";

interface AnimatedTextProps {
  text: string;
  className?: string;
  wordDelay?: number; // Delay between each word in ms
  animationDuration?: number; // Duration of fade animation in ms
  onComplete?: () => void; // Callback when animation completes
}

export function AnimatedText({
  text,
  className,
  wordDelay = 30,
  animationDuration = 300,
  onComplete,
}: AnimatedTextProps) {
  const [visibleCount, setVisibleCount] = useState(0);
  const hasCalledComplete = useRef(false);

  const words = useMemo(() => text.split(/(\s+)/), [text]);

  useEffect(() => {
    setVisibleCount(0);
    hasCalledComplete.current = false;
  }, [text]);

  useEffect(() => {
    if (visibleCount >= words.length) {
      // Wait for the last word's animation to complete before calling onComplete
      if (!hasCalledComplete.current && onComplete) {
        hasCalledComplete.current = true;
        const timer = setTimeout(() => {
          onComplete();
        }, animationDuration);
        return () => clearTimeout(timer);
      }
      return;
    }

    const timer = setTimeout(() => {
      setVisibleCount((prev) => prev + 1);
    }, wordDelay);

    return () => clearTimeout(timer);
  }, [visibleCount, words.length, wordDelay, animationDuration, onComplete]);

  return (
    <span className={cn("inline", className)}>
      {words.map((word, index) => (
        <span
          key={index}
          className="inline transition-opacity"
          style={{
            opacity: index < visibleCount ? 1 : 0,
            transitionDuration: `${animationDuration}ms`,
          }}
        >
          {word}
        </span>
      ))}
    </span>
  );
}
