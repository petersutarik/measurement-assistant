"use client";

import { useSetAssistantContext, type AssistantScreenContext } from "./assistant-context";

/**
 * Drop-in client component that sets the assistant screen context.
 * Render it anywhere in a page to register context for the assistant.
 */
export function ScreenContextSetter(props: AssistantScreenContext) {
  useSetAssistantContext(props);
  return null;
}
