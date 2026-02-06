const PENDING_SESSION_KEY = "prompt-architect-pending-session";

export interface PendingSession {
  id: string;
  description: string;
  questionAnswers?: Record<number, string>;
  productType?: string;
  platform?: string;
  specMode?: string;
  targetAgent?: string;
  isComplete?: boolean;
  spec: string;
  createdAt: number;
  lastUpdated: number;
}

function generateId(): string {
  return `pending-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Save or update the pending session in localStorage.
 * Merges with existing data if present.
 */
export function savePendingSession(data: Partial<Omit<PendingSession, "id" | "createdAt" | "lastUpdated">>): void {
  if (typeof window === "undefined") return;

  try {
    const existing = getPendingSession();
    const now = Date.now();

    const session: PendingSession = {
      id: existing?.id || generateId(),
      description: data.description ?? existing?.description ?? "",
      questionAnswers: data.questionAnswers ?? existing?.questionAnswers,
      productType: data.productType ?? existing?.productType,
      platform: data.platform ?? existing?.platform,
      specMode: data.specMode ?? existing?.specMode,
      targetAgent: data.targetAgent ?? existing?.targetAgent,
      isComplete: data.isComplete ?? existing?.isComplete,
      spec: data.spec ?? existing?.spec ?? "",
      createdAt: existing?.createdAt ?? now,
      lastUpdated: now,
    };

    localStorage.setItem(PENDING_SESSION_KEY, JSON.stringify(session));
  } catch (error) {
    console.error("Failed to save pending session:", error);
  }
}

/**
 * Retrieve the pending session from localStorage.
 */
export function getPendingSession(): PendingSession | null {
  if (typeof window === "undefined") return null;

  try {
    const stored = localStorage.getItem(PENDING_SESSION_KEY);
    if (!stored) return null;
    return JSON.parse(stored) as PendingSession;
  } catch (error) {
    console.error("Failed to get pending session:", error);
    return null;
  }
}

/**
 * Clear the pending session from localStorage.
 */
export function clearPendingSession(): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.removeItem(PENDING_SESSION_KEY);
  } catch (error) {
    console.error("Failed to clear pending session:", error);
  }
}

/**
 * Check if a pending session exists.
 */
export function hasPendingSession(): boolean {
  if (typeof window === "undefined") return false;

  try {
    return localStorage.getItem(PENDING_SESSION_KEY) !== null;
  } catch {
    return false;
  }
}
