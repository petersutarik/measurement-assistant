import { notFound } from "next/navigation";
import { getPlan, getContextSources, getProjectEntities } from "../actions";
import { PlanBuilder } from "./plan-builder";

export default async function PlanDetailPage({
  params,
}: {
  params: Promise<{ id: string; planId: string }>;
}) {
  const { id, planId } = await params;

  let plan;
  try {
    const result = await getPlan(id, planId);
    plan = result.plan;
  } catch {
    notFound();
  }

  const [contextSources, entities] = await Promise.all([
    getContextSources(planId),
    getProjectEntities(id),
  ]);

  return (
    <PlanBuilder
      projectId={id}
      planId={planId}
      initialTitle={plan.title}
      initialDocument={plan.document}
      initialMessages={
        (plan.messages as Array<{
          role: "user" | "assistant";
          content: string;
          timestamp: string;
        }>) ?? []
      }
      contextSources={contextSources.map((s) => ({
        id: s.id,
        type: s.type,
        name: s.name,
        content: s.content,
      }))}
      existingEvents={entities.events.map((e) => ({
        id: e.id,
        name: e.name,
        description: e.description,
        trigger: e.trigger,
        category: e.category,
      }))}
      existingParameters={entities.parameters.map((p) => ({
        name: p.name,
        type: p.type,
        eventId: p.eventId,
        description: p.description,
      }))}
    />
  );
}
