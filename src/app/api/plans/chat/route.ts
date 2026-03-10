import { streamText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { getUserContext } from "@/lib/auth/user-context";
import { PLAN_SYSTEM_PROMPT } from "@/lib/plans/prompts";
import type { PlanMessage } from "@/types";

interface ContextSource {
  type: string;
  name: string;
  content: string;
}

interface ExistingEvent {
  name: string;
  description: string | null;
  trigger: string | null;
  category: string | null;
}

export async function POST(req: Request) {
  const ctx = await getUserContext();
  if (!ctx) return new Response("Unauthorized", { status: 401 });

  const { messages, document, contextSources, existingEvents } =
    (await req.json()) as {
      messages: PlanMessage[];
      document: string;
      contextSources?: ContextSource[];
      existingEvents?: ExistingEvent[];
    };

  // Build system prompt with all available context
  let systemPrompt = PLAN_SYSTEM_PROMPT;

  if (contextSources && contextSources.length > 0) {
    systemPrompt += "\n\n## Context provided by the user\n";
    for (const source of contextSources) {
      systemPrompt += `\n### ${source.name} (${source.type})\n${source.content}\n`;
    }
  }

  if (existingEvents && existingEvents.length > 0) {
    systemPrompt += "\n\n## Existing events in this project\n";
    systemPrompt +=
      "The project already has these published events. Reference them when relevant and avoid duplicating them:\n\n";
    for (const event of existingEvents) {
      systemPrompt += `- **${event.name}**`;
      if (event.category) systemPrompt += ` [${event.category}]`;
      if (event.trigger) systemPrompt += ` — trigger: ${event.trigger}`;
      if (event.description) systemPrompt += ` — ${event.description}`;
      systemPrompt += "\n";
    }
  }

  if (document) {
    systemPrompt += `\n\n## Current document state\n\`\`\`markdown\n${document}\n\`\`\``;
  }

  const result = streamText({
    model: anthropic("claude-sonnet-4-20250514"),
    system: systemPrompt,
    messages: messages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
  });

  return result.toTextStreamResponse();
}
