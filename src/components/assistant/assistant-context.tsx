"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";

export interface AssistantScreenContext {
  screen: string;
  projectId: string;
  workspaceId?: string;
  eventId?: string;
  view: "workspace" | "published" | "other";
  summary: string;
  data: Record<string, unknown>;
}

interface AssistantContextValue {
  screenContext: AssistantScreenContext | null;
  setScreenContext: (ctx: AssistantScreenContext | null) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const AssistantContext = createContext<AssistantContextValue | null>(null);

export function AssistantProvider({ children }: { children: ReactNode }) {
  const [screenContext, setScreenContext] =
    useState<AssistantScreenContext | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  return (
    <AssistantContext value={{ screenContext, setScreenContext, isOpen, setIsOpen }}>
      {children}
    </AssistantContext>
  );
}

export function useAssistant() {
  const ctx = useContext(AssistantContext);
  if (!ctx) throw new Error("useAssistant must be used within AssistantProvider");
  return ctx;
}

/**
 * Hook for pages to register their screen context.
 * Automatically clears when the component unmounts.
 */
export function useSetAssistantContext(ctx: AssistantScreenContext) {
  const { setScreenContext } = useAssistant();

  useEffect(() => {
    setScreenContext(ctx);
    return () => setScreenContext(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(ctx)]);
}
