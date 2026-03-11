import {
  streamText,
  tool,
  stepCountIs,
  convertToModelMessages,
  type UIMessage,
} from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { getUserContext } from "@/lib/auth/user-context";
import { ASSISTANT_SYSTEM_PROMPT } from "@/lib/assistant/prompts";

interface ScreenContext {
  screen: string;
  projectId: string;
  workspaceId?: string;
  eventId?: string;
  view: "workspace" | "published" | "other";
  summary: string;
  data: Record<string, unknown>;
}

async function executeToolCall(
  toolCall: Record<string, unknown>,
  cookies: string
): Promise<Record<string, unknown>> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const res = await fetch(`${baseUrl}/api/assistant/execute`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookies,
    },
    body: JSON.stringify(toolCall),
  });
  return res.json() as Promise<Record<string, unknown>>;
}

function buildTools(projectId: string, workspaceId: string, cookies: string) {
  const exec = (toolName: string, args: Record<string, unknown>) =>
    executeToolCall({ tool: toolName, projectId, workspaceId, ...args }, cookies);

  return {
    create_event: tool({
      description:
        "Create a new event in the current workspace. Use when the user asks to add a new tracking event.",
      inputSchema: z.object({
        name: z.string().describe("Event name in snake_case"),
        description: z.string().optional().describe("What the event tracks"),
        trigger: z.string().optional().describe("When the event fires"),
        category: z.string().optional().describe("Event category"),
        pagePattern: z.string().optional().describe("URL pattern where the event fires"),
        implementationNotes: z.string().optional().describe("Technical implementation notes"),
      }),
      execute: async (args) => exec("create_event", args),
    }),
    update_event: tool({
      description:
        "Update an existing event. Use when the user asks to change an event's name, description, trigger, category, etc.",
      inputSchema: z.object({
        eventId: z.string().describe("The event ID to update"),
        name: z.string().optional().describe("New event name"),
        description: z.string().optional().describe("New description"),
        trigger: z.string().optional().describe("New trigger"),
        category: z.string().optional().describe("New category"),
        pagePattern: z.string().optional().describe("New page pattern"),
        implementationNotes: z.string().optional().describe("New implementation notes"),
      }),
      execute: async (args) => exec("update_event", args),
    }),
    delete_event: tool({
      description:
        "Delete an event from the workspace. Use only when the user explicitly asks to remove an event.",
      inputSchema: z.object({
        eventId: z.string().describe("The event ID to delete"),
      }),
      execute: async (args) => exec("delete_event", args),
    }),
    create_parameter: tool({
      description:
        "Add a parameter to an event. Use when the user asks to add a new parameter/property to a tracking event.",
      inputSchema: z.object({
        eventId: z.string().describe("The event ID to add the parameter to"),
        name: z.string().describe("Parameter name in snake_case"),
        type: z
          .enum(["string", "number", "boolean", "array", "object"])
          .describe("Parameter data type"),
        description: z.string().optional().describe("What the parameter contains"),
        isRequired: z.boolean().optional().describe("Whether the parameter is required"),
        exampleValue: z.string().optional().describe("Example value"),
      }),
      execute: async (args) => exec("create_parameter", args),
    }),
    update_parameter: tool({
      description:
        "Update an existing parameter. Use when the user asks to change a parameter's name, type, description, etc.",
      inputSchema: z.object({
        eventId: z.string().describe("The event ID the parameter belongs to"),
        parameterId: z.string().describe("The parameter ID to update"),
        name: z.string().optional().describe("New parameter name"),
        type: z
          .enum(["string", "number", "boolean", "array", "object"])
          .optional()
          .describe("New data type"),
        description: z.string().optional().describe("New description"),
        isRequired: z.boolean().optional().describe("Whether the parameter is required"),
        exampleValue: z.string().optional().describe("New example value"),
      }),
      execute: async (args) => exec("update_parameter", args),
    }),
    delete_parameter: tool({
      description:
        "Remove a parameter from an event. Use only when the user explicitly asks to remove a parameter.",
      inputSchema: z.object({
        eventId: z.string().describe("The event ID"),
        parameterId: z.string().describe("The parameter ID to delete"),
      }),
      execute: async (args) => exec("delete_parameter", args),
    }),
  };
}

export async function POST(req: Request) {
  const ctx = await getUserContext();
  if (!ctx) return new Response("Unauthorized", { status: 401 });

  const cookies = req.headers.get("cookie") ?? "";
  const body = await req.json();
  const screenContext = body.screenContext as ScreenContext | null;
  const uiMessages = body.messages as UIMessage[];

  let systemPrompt = ASSISTANT_SYSTEM_PROMPT;

  if (screenContext) {
    systemPrompt += `\n\n## Current screen\n`;
    systemPrompt += `- **Screen:** ${screenContext.screen}\n`;
    systemPrompt += `- **View:** ${screenContext.view}${screenContext.view === "published" ? " (read-only)" : " (editable)"}\n`;
    systemPrompt += `- **Summary:** ${screenContext.summary}\n`;
    systemPrompt += `- **Project ID:** ${screenContext.projectId}\n`;
    if (screenContext.workspaceId) {
      systemPrompt += `- **Workspace ID:** ${screenContext.workspaceId}\n`;
    }
    if (screenContext.eventId) {
      systemPrompt += `- **Event ID:** ${screenContext.eventId}\n`;
    }

    if (screenContext.data && Object.keys(screenContext.data).length > 0) {
      systemPrompt += `\n## Screen data\n\`\`\`json\n${JSON.stringify(screenContext.data, null, 2)}\n\`\`\``;
    }
  }

  const tools =
    screenContext?.view === "workspace" && screenContext.workspaceId
      ? buildTools(screenContext.projectId, screenContext.workspaceId, cookies)
      : undefined;

  const modelMessages = await convertToModelMessages(uiMessages);

  const result = streamText({
    model: anthropic("claude-sonnet-4-20250514"),
    system: systemPrompt,
    messages: modelMessages,
    tools,
    stopWhen: stepCountIs(5),
  });

  return result.toUIMessageStreamResponse();
}
