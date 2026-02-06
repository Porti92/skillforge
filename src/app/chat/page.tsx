"use client";

import { useState, useRef, useEffect, Suspense, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useCompletion } from "@ai-sdk/react";
import { TiptapEditor } from "@/components/TiptapEditor";
import { Button } from "@/components/ui/button";
import { Copy, Download, Check, Loader2, ArrowUp, Square, PanelLeftClose, PanelLeftOpen, Lock } from "lucide-react";
import { TextShimmerWave } from "@/components/ui/text-shimmer-wave";
import {
  PromptInput,
  PromptInputAction,
  PromptInputActions,
  PromptInputTextarea,
} from "@/components/ui/prompt-input";
import {
  ChatContainerRoot,
  ChatContainerContent,
  ChatContainerScrollAnchor,
} from "@/components/ui/chat-container";
import { ScrollButton } from "@/components/ui/scroll-button";
import {
  Message as MessageComponent,
  MessageContent,
} from "@/components/ui/message";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useSessions, type Session, type ChatMessage as SessionChatMessage } from "@/hooks/use-sessions";
import { useAuth } from "@/contexts/AuthContext";
import { SignUpModal } from "@/components/SignUpModal";
import {
  savePendingSession,
  getPendingSession,
  clearPendingSession,
  hasPendingSession,
} from "@/lib/pending-session";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AnimatedText } from "@/components/ui/animated-text";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const SKILL_DELIMITER = "---SKILL_START---";

// Parse AI response to extract conversational message and skill
function parseAIResponse(response: string): { message: string; spec: string } {
  const delimiterIndex = response.indexOf(SKILL_DELIMITER);
  if (delimiterIndex === -1) {
    // No delimiter found - treat entire response as skill (backwards compatibility)
    return { message: "", spec: response };
  }
  const message = response.substring(0, delimiterIndex).trim();
  const spec = response.substring(delimiterIndex + SKILL_DELIMITER.length).trim();
  return { message, spec };
}


function ChatContent() {
  const searchParams = useSearchParams();
  const initialDescription = searchParams.get("description") || "";
  const sessionId = searchParams.get("session") || "";
  const fromQuestions = searchParams.get("fromQuestions") === "true";
  const restorePending = searchParams.get("restorePending") === "true";
  const productType = searchParams.get("productType") || "";
  const platform = searchParams.get("platform") || "";
  const targetAgent = searchParams.get("agent") || "";

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [currentSpec, setCurrentSpec] = useState("");
  const [copied, setCopied] = useState(false);
  const [isChatCollapsed, setIsChatCollapsed] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [signUpModalOpen, setSignUpModalOpen] = useState(false);
  const [animatingMessageIndex, setAnimatingMessageIndex] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pendingSpecRef = useRef<string | null>(null);
  const currentSpecRef = useRef("");
  const messagesRef = useRef<ChatMessage[]>([]);
  const hasStartedRef = useRef(false);
  const descriptionRef = useRef(initialDescription);
  const questionAnswersRef = useRef<Record<number, string> | null>(null);
  const pendingRestoredRef = useRef(false);
  const specModeRef = useRef<string>("mvp");
  const sessionInitializedRef = useRef(false);
  const sessionCreationPromiseRef = useRef<Promise<Session> | null>(null);
  const activeAgentRef = useRef<string | undefined>(targetAgent || undefined);
  const authPromptedRef = useRef(false);

  const { saveSession, updateSession, getSession, isLoaded } = useSessions();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (currentSessionId) {
      sessionInitializedRef.current = true;
    }
  }, [currentSessionId]);

  const ensureSessionExists = useCallback(
    (
      description: string,
      options?: {
        initialMessages?: ChatMessage[];
        spec?: string;
        onSuccess?: () => void;
      }
    ) => {
      if (sessionInitializedRef.current || currentSessionId || !description.trim()) return;

      const { initialMessages = [], spec, onSuccess } = options ?? {};
      sessionInitializedRef.current = true;

      const creationPromise = saveSession(
        description,
        spec,
        initialMessages.length > 0 ? initialMessages : undefined
      );
      sessionCreationPromiseRef.current = creationPromise;

      creationPromise
        .then((newSession) => {
          setCurrentSessionId(newSession.id);
          onSuccess?.();
        })
        .catch((error) => {
          console.error("Failed to create session:", error);
          sessionInitializedRef.current = false;
        })
        .finally(() => {
          sessionCreationPromiseRef.current = null;
        });
    },
    [currentSessionId, saveSession]
  );

  // Prompt unauthenticated users to sign in when they arrive from the onboarding flow
  useEffect(() => {
    if (isAuthenticated || authPromptedRef.current) return;
    if (fromQuestions) {
      authPromptedRef.current = true;
      setSignUpModalOpen(true);
    }
  }, [isAuthenticated, fromQuestions]);

  // Close the sign up modal automatically once the user authenticates
  useEffect(() => {
    if (isAuthenticated && signUpModalOpen) {
      setSignUpModalOpen(false);
    }
  }, [isAuthenticated, signUpModalOpen]);

  // Define handleSaveSession first (used by useCompletion's onFinish)
  const handleSaveSession = useCallback(async (description: string, spec: string, newMessages: ChatMessage[]) => {
    // For unauthenticated users, only save to pending session - don't create a real session
    // This prevents duplicates when they authenticate later
    if (!isAuthenticated) {
      savePendingSession({
        description,
        spec,
        questionAnswers: questionAnswersRef.current ?? undefined,
        productType: productType || undefined,
        platform: platform || undefined,
        targetAgent: activeAgentRef.current,
        isComplete: true,
      });
      return;
    }

    let resolvedSessionId = currentSessionId;

    if (!resolvedSessionId && sessionCreationPromiseRef.current) {
      try {
        const pendingSession = await sessionCreationPromiseRef.current;
        resolvedSessionId = pendingSession.id;
        setCurrentSessionId(pendingSession.id);
      } catch (error) {
        console.error("Failed to finalize pending session creation:", error);
      }
    }

    if (resolvedSessionId) {
      await updateSession(resolvedSessionId, { spec, messages: newMessages });
    } else {
      const newSession = await saveSession(description, spec, newMessages);
      resolvedSessionId = newSession.id;
      setCurrentSessionId(newSession.id);
      sessionInitializedRef.current = true;
    }

    clearPendingSession();
  }, [currentSessionId, saveSession, updateSession, isAuthenticated, productType, platform]);

  // Callback to apply pending spec after animation completes
  const applyPendingSpec = useCallback(() => {
    if (pendingSpecRef.current !== null) {
      setCurrentSpec(pendingSpecRef.current);
      currentSpecRef.current = pendingSpecRef.current;
      pendingSpecRef.current = null;
    }
  }, []);

  // Define useCompletion before effects that use `completion`
  const { completion, isLoading, complete, error } = useCompletion({
    api: "/api/chat",
    streamProtocol: "text",
    onFinish: (_prompt, completionText) => {
      // Parse the response to extract conversational message and spec
      const { message: aiMessage, spec } = parseAIResponse(completionText);

      // Check if this is initial generation (no existing spec) vs follow-up refinement
      const isInitial = !currentSpecRef.current;

      // Build updated messages with the assistant's conversational response
      const lastMessage = messagesRef.current[messagesRef.current.length - 1];
      let updatedMessages = messagesRef.current;
      if (lastMessage?.role === "user") {
        // Store the conversational message (or a default if none provided)
        const messageContent = aiMessage || "I've updated the prompt based on your input.";
        updatedMessages = [...messagesRef.current, { role: "assistant" as const, content: messageContent }];
        messagesRef.current = updatedMessages;
        setMessages(updatedMessages);

        if (isInitial) {
          // Initial generation: apply spec immediately (it was already streaming in canvas)
          setCurrentSpec(spec);
          currentSpecRef.current = spec;
          // Still trigger animation for the chat message, but no pending spec
          setAnimatingMessageIndex(updatedMessages.length - 1);
        } else {
          // Follow-up refinement: wait for chat animation before updating canvas
          setAnimatingMessageIndex(updatedMessages.length - 1);
          pendingSpecRef.current = spec;
        }
      } else {
        // No animation needed, apply spec immediately
        setCurrentSpec(spec);
        currentSpecRef.current = spec;
      }

      // Save session when skill is complete (check for SKILL.md file marker)
      if (spec.includes('===FILE: SKILL.md===') || spec.includes('# ')) {
        handleSaveSession(descriptionRef.current, spec, updatedMessages);
        // Clear questionAnswers from sessionStorage now that we've saved
        sessionStorage.removeItem("questionAnswers");
      }
    },
  });

  // Load existing session if sessionId is provided
  useEffect(() => {
    if (sessionId && isLoaded) {
      const session = getSession(sessionId);
      if (session) {
        setCurrentSessionId(session.id);
        descriptionRef.current = session.description;
        setInput(""); // Clear the prompt input when switching sessions
        if (session.spec) {
          setCurrentSpec(session.spec);
          currentSpecRef.current = session.spec;
          // Restore messages from database if available, otherwise use description as fallback
          const restoredMessages = session.messages || [{ role: "user" as const, content: session.description }];
          setMessages(restoredMessages);
          messagesRef.current = restoredMessages;
        }
      }
    }
  }, [sessionId, isLoaded, getSession]);

  // Restore pending session when returning from auth or refreshing
  useEffect(() => {
    if (pendingRestoredRef.current) return;
    if (sessionId) return; // Don't restore if loading existing session
    if (!isLoaded) return;

    const pending = getPendingSession();
    if (!pending) return;

    // If we came fromQuestions, that effect will handle everything - don't duplicate
    if (fromQuestions) return;

    pendingRestoredRef.current = true;
    // Mark hasStartedRef to prevent fromQuestions effect from running if URL changes
    hasStartedRef.current = true;

    descriptionRef.current = pending.description;
    questionAnswersRef.current = pending.questionAnswers ?? null;
    activeAgentRef.current = pending.targetAgent ?? activeAgentRef.current;

    const restoredMessages: ChatMessage[] = pending.description
      ? [{ role: "user", content: pending.description }]
      : [];
    if (restoredMessages.length > 0) {
      setMessages(restoredMessages);
      messagesRef.current = restoredMessages;
    }

    const pendingComplete = pending.isComplete ?? false;
    const hasPendingSpec = !!pending.spec;

    if (hasPendingSpec) {
      setCurrentSpec(pending.spec);
      currentSpecRef.current = pending.spec;
    } else {
      setCurrentSpec("");
      currentSpecRef.current = "";
    }

    // Only create a session if spec is complete and user is authenticated
    // For unauthenticated users, let the generation complete and save to pending session
    if (hasPendingSpec && pendingComplete && isAuthenticated) {
      ensureSessionExists(pending.description, {
        initialMessages: restoredMessages,
        spec: pending.spec,
        onSuccess: () => {
          clearPendingSession();
        },
      });
    }

    // Only regenerate if the generation was not complete
    const shouldRegenerate = !pendingComplete && !!pending.questionAnswers;

    if (shouldRegenerate && pending.questionAnswers) {
      complete("Generating final specification...", {
        body: {
          messages: [],
          currentSpec: "",
          productType: pending.productType || productType,
          platform: pending.platform || platform,
          structuredAnswers: pending.questionAnswers,
          originalPrompt: pending.description,
          targetAgent: pending.targetAgent || targetAgent || undefined,
          specMode: pending.specMode || "mvp",
        },
      });
    }

    if (restorePending) {
      window.history.replaceState({}, "", "/chat");
    }
  }, [isLoaded, isAuthenticated, sessionId, fromQuestions, restorePending, complete, productType, platform, targetAgent, ensureSessionExists]);

  // Save streaming progress for anonymous users (debounced)
  useEffect(() => {
    if (!completion || isAuthenticated) return;

    const timeoutId = setTimeout(() => {
      savePendingSession({
        description: descriptionRef.current,
        spec: completion,
        questionAnswers: questionAnswersRef.current ?? undefined,
        productType: productType || undefined,
        platform: platform || undefined,
        targetAgent: activeAgentRef.current,
        isComplete: false,
      });
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [completion, isAuthenticated, productType, platform]);

  // Extract streaming message and spec for display
  let streamingMessage = "";
  let streamingSpec = "";
  if (isLoading && completion) {
    const hasDelimiter = completion.includes(SPEC_DELIMITER);
    if (hasDelimiter) {
      const delimiterIndex = completion.indexOf(SPEC_DELIMITER);
      streamingMessage = completion.substring(0, delimiterIndex).trim();
      streamingSpec = completion.substring(delimiterIndex + SPEC_DELIMITER.length).trim();
    } else {
      // No delimiter yet - this is still the conversational part
      streamingMessage = completion.trim();
    }
  }

  // Canvas display logic:
  // - While streaming (isLoading): show streaming spec in real-time
  // - After streaming, during chat animation (animatingMessageIndex !== null): show currentSpec (old)
  // - After animation completes: show updated currentSpec (new)
  const displaySpec = isLoading && streamingSpec ? streamingSpec : currentSpec;
  const shouldForceChatRedirect = fromQuestions || hasPendingSession();
  const forcedReturnPath = shouldForceChatRedirect ? "/chat?restorePending=true" : undefined;

  // Handle coming from questions page with answers
  useEffect(() => {
    if (fromQuestions && !hasStartedRef.current) {
      hasStartedRef.current = true;

      const storedData = sessionStorage.getItem("questionAnswers");
      if (storedData) {
        const { answers, description, productType: pt, platform: pl, specMode: sm, agent: storedAgent } = JSON.parse(storedData);
        // Store answers and specMode in refs for pending session (don't clear sessionStorage yet)
        questionAnswersRef.current = answers;
        specModeRef.current = sm || "mvp";
        const effectiveProductType = pt || productType;
        const effectivePlatform = pl || platform;
        const effectiveAgent = storedAgent || targetAgent || undefined;
        activeAgentRef.current = effectiveAgent;

        descriptionRef.current = description;
        const initialMessages: ChatMessage[] = [{ role: "user", content: description }];
        setMessages(initialMessages);
        messagesRef.current = initialMessages;

        // Only create session immediately if user is authenticated
        // For unauthenticated users, we save to pending session and create after generation completes
        if (isAuthenticated) {
          ensureSessionExists(description, { initialMessages });
        }

        // Save initial pending session state for anonymous users
        savePendingSession({
          description,
          questionAnswers: answers,
          productType: effectiveProductType,
          platform: effectivePlatform,
          specMode: sm || "mvp",
          spec: "",
          targetAgent: effectiveAgent,
          isComplete: false,
        });

        // Generate the final spec using the structured answers
        complete("Generating final specification...", {
          body: {
            messages: [],
            currentSpec: "",
            productType: effectiveProductType,
            platform: effectivePlatform,
            structuredAnswers: answers,
            originalPrompt: description,
            specMode: sm || "mvp",
            targetAgent: effectiveAgent,
          },
        });
      }
    }
  }, [fromQuestions, complete, productType, platform, targetAgent, ensureSessionExists, isAuthenticated]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, completion]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const userMessage = input.trim();
    setInput("");
    const newMessage: ChatMessage = { role: "user", content: userMessage };
    const updatedMessages = [...messages, newMessage];
    setMessages(updatedMessages);
    messagesRef.current = updatedMessages;

    await complete(userMessage, {
      body: {
        messages: updatedMessages,
        currentSpec: currentSpecRef.current,
        productType,
        platform,
        specMode: specModeRef.current,
        targetAgent: activeAgentRef.current,
      },
    });
  };


  const handleCopy = async () => {
    if (!isAuthenticated) {
      setSignUpModalOpen(true);
      return;
    }
    const text = displaySpec;
    if (text) {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleExport = () => {
    if (!isAuthenticated) {
      setSignUpModalOpen(true);
      return;
    }
    const text = displaySpec;
    if (text) {
      const blob = new Blob([text], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "SKILL.md";
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleContentChange = (newContent: string) => {
    if (!isAuthenticated) {
      setSignUpModalOpen(true);
      return;
    }
    setCurrentSpec(newContent);
    currentSpecRef.current = newContent;
  };

  return (
    <div className="flex h-full max-h-full bg-[#0a0a0b] text-zinc-100 overflow-hidden">
      {/* Left: Chat Panel */}
      <div className={`flex flex-col border-r border-zinc-800 flex-shrink-0 transition-all duration-300 ease-in-out overflow-hidden ${
        isChatCollapsed ? 'w-12' : 'w-[400px]'
      }`}>
        <div className={`flex items-center border-b border-zinc-800 px-4 py-3 ${
          isChatCollapsed ? 'justify-center' : 'justify-between'
        }`} style={{ backgroundColor: "var(--card)" }}>
          {isChatCollapsed ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsChatCollapsed(false)}
              className="h-8 w-8 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
              title="Expand chat"
            >
              <PanelLeftOpen className="h-4 w-4" />
            </Button>
          ) : (
            <>
              <h1 className="font-medium text-zinc-200">Chat</h1>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsChatCollapsed(true)}
                className="h-8 w-8 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
                title="Collapse chat"
              >
                <PanelLeftClose className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>

        {!isChatCollapsed && (
          <>
            <div className="relative flex-1 overflow-hidden" style={{ backgroundColor: "var(--card)" }}>
              <ChatContainerRoot className="h-full p-4" style={{ backgroundColor: "var(--card)" }}>
                <ChatContainerContent className="space-y-4" style={{ margin: 0, backgroundColor: "var(--card)" }}>
                  {messages.map((msg, i) => (
                    <MessageComponent
                      key={i}
                      className={msg.role === "user" ? "justify-end" : "justify-start"}
                      style={
                        msg.role === "assistant"
                          ? {
                              color: "rgba(94, 94, 186, 1)",
                              opacity: 1,
                              background: "unset",
                              backgroundColor: "unset",
                            }
                          : undefined
                      }
                    >
                      {msg.role === "user" ? (
                        <MessageContent
                          className="bg-amber-600/90 text-zinc-950"
                          style={{
                            borderWidth: "1px",
                            borderColor: "rgba(0, 0, 0, 1)",
                            backgroundColor: "var(--accent)",
                            color: "var(--primary)",
                          }}
                        >
                          {msg.content}
                        </MessageContent>
                      ) : (
                        <MessageContent
                          className="text-zinc-100"
                          style={{
                            backgroundColor: "var(--card)",
                            borderWidth: "0px",
                            borderStyle: "none",
                            borderColor: "rgba(0, 0, 0, 0)",
                            borderImage: "none",
                          }}
                        >
                          {i === animatingMessageIndex ? (
                            <AnimatedText
                              text={msg.content}
                              wordDelay={40}
                              animationDuration={200}
                              onComplete={() => {
                                setAnimatingMessageIndex(null);
                                applyPendingSpec();
                              }}
                            />
                          ) : (
                            msg.content
                          )}
                        </MessageContent>
                      )}
                    </MessageComponent>
                  ))}
                  {isLoading && messages[messages.length - 1]?.role === "user" && (
                    <MessageComponent
                      className="justify-start"
                      style={{
                        color: "rgba(94, 94, 186, 1)",
                        opacity: 1,
                        background: "unset",
                        backgroundColor: "unset",
                      }}
                    >
                      {streamingMessage ? (
                        <MessageContent
                          className="text-zinc-100"
                          style={{
                            backgroundColor: "var(--card)",
                          }}
                        >
                          {streamingMessage}
                        </MessageContent>
                      ) : (
                        <div className="rounded-lg p-2 bg-zinc-800 flex items-center gap-2" style={{ backgroundColor: "var(--card)" }}>
                          <TextShimmerWave
                            className="text-sm text-zinc-400"
                            duration={1.2}
                            spread={2}
                          >
                            Thinking...
                          </TextShimmerWave>
                        </div>
                      )}
                    </MessageComponent>
                  )}
                  {error && (
                    <MessageComponent className="justify-start">
                      <div className="rounded-lg p-2 bg-red-900/50 text-red-300">
                        Error: {error.message}
                      </div>
                    </MessageComponent>
                  )}
                  <ChatContainerScrollAnchor />
                </ChatContainerContent>
                <div className="absolute right-4 bottom-4">
                  <ScrollButton />
                </div>
              </ChatContainerRoot>
            </div>

            <div className="p-[14px]" style={{ backgroundColor: "var(--card)" }}>
              <PromptInput
                value={input}
                onValueChange={setInput}
                isLoading={isLoading}
                onSubmit={handleSend}
                maxHeight={200}
                className="w-full"
              >
                <PromptInputTextarea
                  placeholder={
                    displaySpec && !displaySpec.includes('===FILE: SKILL.md===') && !displaySpec.includes('# ')
                      ? "Answer the questions above..."
                      : "Refine the skill (e.g., 'Add error handling', 'Include a helper script')..."
                  }
                  className="text-zinc-100 placeholder:text-zinc-600"
                />
                <PromptInputActions className="justify-end pt-2">
                  <PromptInputAction
                    tooltip={isLoading ? "Stop generation" : "Send message"}
                  >
                    <Button
                      variant="default"
                      size="icon"
                      className="h-8 w-8 rounded-full bg-amber-600 text-zinc-950 hover:bg-amber-500"
                      onClick={handleSend}
                      disabled={!input.trim() || isLoading}
                    >
                      {isLoading ? (
                        <Square className="size-4 fill-current" />
                      ) : (
                        <ArrowUp className="size-4" />
                      )}
                    </Button>
                  </PromptInputAction>
                </PromptInputActions>
              </PromptInput>
            </div>
          </>
        )}
      </div>

      {/* Right: Canvas */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {displaySpec ? (
          <Tabs defaultValue="edit" className="h-full flex flex-col overflow-hidden" style={{ backgroundColor: "var(--card)" }}>
            <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-3" style={{ backgroundColor: "var(--card)" }}>
              <div className="flex items-center gap-4">
                <h2 className="font-medium text-zinc-300">
                  {!displaySpec.includes('===FILE: SKILL.md===') && !displaySpec.includes('# ') 
                    ? "Clarifying Questions"
                    : "Generated Skill"}
                </h2>
                <TabsList className="bg-zinc-900/80 border border-zinc-800 h-8">
                  <TabsTrigger
                    value="edit"
                    className="text-xs text-white data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100"
                  >
                    Edit
                  </TabsTrigger>
                  <TabsTrigger
                    value="markdown"
                    className="text-xs text-white data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100"
                  >
                    Markdown
                  </TabsTrigger>
                </TabsList>
              </div>
              {(displaySpec.includes('===FILE: SKILL.md===') || displaySpec.includes('# ')) && (
                <TooltipProvider>
                  <div className="flex gap-2" style={{ backgroundColor: "var(--card)" }}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleCopy}
                          className="border-zinc-800 bg-zinc-900/50 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100"
                        >
                          {copied ? (
                            <>
                              <Check className="h-3.5 w-3.5 text-emerald-500" />
                              Copied
                            </>
                          ) : (
                            <>
                              {!isAuthenticated && <Lock className="h-3 w-3 mr-1" />}
                              <Copy className="h-3.5 w-3.5" />
                              Copy
                            </>
                          )}
                        </Button>
                      </TooltipTrigger>
                      {!isAuthenticated && (
                        <TooltipContent>
                          <p>Sign up to copy</p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleExport}
                          className="border-zinc-800 bg-zinc-900/50 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100"
                        >
                          {!isAuthenticated && <Lock className="h-3 w-3 mr-1" />}
                          <Download className="h-3.5 w-3.5" />
                          Export .md
                        </Button>
                      </TooltipTrigger>
                      {!isAuthenticated && (
                        <TooltipContent>
                          <p>Sign up to export</p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </div>
                </TooltipProvider>
              )}
            </div>

            <div className="flex-1 overflow-hidden bg-[#0e0e0e]" style={{ backgroundColor: "var(--card)" }}>
              <TabsContent value="edit" className="h-full overflow-y-auto m-0">
                <TiptapEditor
                  content={displaySpec}
                  onChange={handleContentChange}
                  editable={isAuthenticated}
                  className="h-full"
                />
              </TabsContent>
              <TabsContent value="markdown" className="h-full overflow-y-auto m-0">
                <div className="p-6">
                  <pre className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 overflow-x-auto">
                    <code className="text-sm text-zinc-300 font-mono whitespace-pre-wrap">
                      {displaySpec}
                    </code>
                  </pre>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        ) : (
          <>
            <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-3">
              <h2 className="font-medium text-zinc-300">Generated Skill</h2>
            </div>
            <div className="flex-1 flex items-center justify-center bg-[#0e0e0e] text-zinc-600">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          </>
        )}
      </div>
      <SignUpModal
        open={signUpModalOpen}
        onOpenChange={setSignUpModalOpen}
        returnTo={forcedReturnPath}
      />
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-[#0a0a0b]">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-600" />
      </div>
    }>
      <ChatContent />
    </Suspense>
  );
}
